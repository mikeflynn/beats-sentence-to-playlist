(ns beats-sentence-to-playlist.core
  (:gen-class :main true)
  (:use [org.httpkit.server :only [run-server]]
        [compojure.core :only [defroutes GET POST context]]
        [compojure.handler :only [site]])
  (:require [ring.middleware.reload :as reload]
            [compojure.route :as route]
            [compojure.handler :as handler]
            [cheshire.core :as json]
            [clojure.java.io :as io]
            [beats-clj.core :as beats]))

(defn get-param [n d]
  (let [system_env (System/getenv n)
        system_prop (System/getProperty n)]
    (if-let [param (if system_env system_env system_prop)]
      param
      (do
        (println (str "Server " n " parameter not set! Defaulting to " d))
        d))))

(def beats-api-key (get-param "BEATS_API_KEY" false))
(def beats-api-secret (get-param "BEATS_API_SECRET" false))

(beats/set-app-key! beats-api-key)
(beats/set-app-secret! beats-api-secret)

(defn get-token
  [code callback]
  (let [auth-response (beats/token-request code callback)]
    (if-let [token (get-in auth-response [:result :access_token])]
      (let [me-response (beats/me :auth token)]
        {:token token
         :userid (get-in me-response [:result :user_context])})
      auth-response)))

(defn get-options
  [user-id token]
  (if-let [resp (beats/sentence-options user-id :auth token)]
    (:data resp)
    false))

(defn get-playlists
  [user-id token]
  (if-let [resp (beats/playlist-list user-id :auth token)]
    (:data resp)
    false))

(defn create-playlist
  [user-id token title place activity people genre & {:keys [total]
                                                      :or {total 20}}]
  (let [total (if (< total 10) 10 total)
        total (if (> total 100) 100 total)
        desc (str "Created by the Beats Sentence Saver.")
        playlist-id (-> (beats/playlist-create title :auth token
                                                     :description desc)
                        (get-in [:data :id]))]
        (when (nil? playlist-id) (throw (Exception. "Unable to create playlist.")))
        (let [status (->> (repeat (quot total 10) "x")
                          (pmap (fn [x] (:data (beats/sentence user-id place activity people genre :auth token))))
                          flatten
                          (map :id)
                          (into [])
                          ((fn [tracks] (beats/playlist-add playlist-id tracks :auth token :mode :append :async false))))]
          {:playlist title :status status})))

(defn delete-playlist
  [playlist-id token]
  (if-let [resp (beats/playlist-delete playlist-id :auth token)]
    {:result resp}
    {:error "Couldn't remove playlist."}))

(def std-response {:status 200
                   :headers {"Content-Type" "application/json"}})

(defroutes all-routes
  (GET "/" []
    (io/resource "public/index.html"))
  (GET "/about" []
    (io/resource "public/about.html"))
  (GET "/playlists" []
    (io/resource "public/playlists.html"))
  (context "/api" []
    (GET "/init" {params :params}
      (->> {:key beats-api-key}
           json/generate-string
           (assoc std-response :body)))
    (POST "/token" {params :params}
      (->> (if (or (not (:callback params)) (not (:code params)))
               {:error "Missing required params."}
               (get-token (:code params) (:callback params)))
           json/generate-string
           (assoc std-response :body)))
    (GET "/options" {params :params}
      (->> (if (or (not (:userid params)) (not (:token params)))
               {:error "Missing required params."}
               (get-options (:userid params) (:token params)))
           json/generate-string
           (assoc std-response :body)))
    (POST "/save" {params :params}
      (->> (if (or (not (:placeid params))
                   (not (:activityid params))
                   (not (:peopleid params))
                   (not (:genreid params))
                   (not (:userid params))
                   (not (:token params)))
               {:error "Missing required params."}
               (try
                 (create-playlist (:userid params)
                                  (:token params)
                                  (:title params (str "from-sentence-" (rand-int 9999)))
                                  (:placeid params)
                                  (:activityid params)
                                  (:peopleid params)
                                  (:genreid params)
                                  :total (Integer/parseInt (:total params 20)))
                 (catch Exception e {:error (.getMessage e)})))
           json/generate-string
           (assoc std-response :body)))
    (GET "/playlist/list" {params :params}
      (->> (if (or (not (:userid params)) (not (:token params)))
               {:error "Missing required params."}
               (get-playlists (:userid params) (:token params)))
           json/generate-string
           (assoc std-response :body)))
    (POST "/playlist/delete" {params :params}
      (->> (if (or (not (:playlistid params)) (not (:token params)))
              {:error "Missing required params."}
              (delete-playlist (:playlistid params) (:token params)))
           json/generate-string
           (assoc std-response :body))))
  (route/resources "/")
  (route/not-found "<p>404: Page not found.</p>"))

(defn -main
  [& args]
  (let [port (if (first args) (Integer/parseInt (first args)) 8080)
        handler (site all-routes)]
    (run-server handler {:port port})))
