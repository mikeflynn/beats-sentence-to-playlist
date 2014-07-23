(ns beats-sentence-to-playlist.core
  (:use [org.httpkit.server :only [run-server]]
        [compojure.core :only [defroutes GET POST context]]
        [compojure.handler :only [site]])
  (:require [ring.middleware.reload :as reload]
            [compojure.route :as route]
            [compojure.handler :as handler]
            [cheshire.core :as json]
            [clojure.java.io :as io]
            [beats-clj.core :as beats]))

(def beats-api-key "qa4tvmpj822938b7bnv77r9j")
(def beats-api-secret "8ungESPtpFDf7Ar5e4P6vw3B")

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

(defn create-playlist
  [user-id token title place activity people genre & {:keys [total]
                                                      :or {total 20}}]
  (let [total (if (< total 10) 10 total)
        total (if (> total 100) 100 total)
        playlist-id (-> (beats/playlist-create title :auth token)
                        (get-in [:data :id]))]
        (when (nil? playlist-id) (throw (Exception. "Unable to create playlist.")))
        (let [status (->> (repeat (quot total 10) "x")
                          (pmap (fn [x] (:data (beats/sentence user-id place activity people genre :auth token))))
                          flatten
                          (map :id)
                          (into [])
                          ((fn [tracks] (beats/playlist-add playlist-id tracks :auth token :mode :append :async false))))]
          {:playlist title :status status})))

(def std-response {:status 200
                   :headers {"Content-Type" "application/json"}})

(defroutes all-routes
  (GET "/" []
    (io/resource "public/index.html"))
  (GET "/about" []
    (io/resource "public/about.html"))
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
               (create-playlist (:userid params)
                                (:token params)
                                (:title params (str "from-sentence-" (rand-int 9999)))
                                (:placeid params)
                                (:activityid params)
                                (:peopleid params)
                                (:genreid params)
                                :total (Integer/parseInt (:total params 20))))
           json/generate-string
           (assoc std-response :body))))
  (route/resources "/")
  (route/not-found "<p>404: Page not found.</p>"))

(defn in-dev?
  [args]
  (> (.indexOf args "dev") -1))

(defn -main
  [& args]
  (let [args (if (nil? args) [] args)
        port (if (in-dev? args) 5000 80)
        handler (site all-routes)]
    (when (in-dev? args)
          (println (str "Server running on http://localhost:" port)))
    (run-server handler {:port port})))
