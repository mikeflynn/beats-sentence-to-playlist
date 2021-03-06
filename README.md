## Update - 2021.01.08

_RIP Beats. This repo has been archived._

_Original README follows..._

# `beats-sentence-to-playlist`

A Clojure and Javascript (ReactJS) web application that allows the user to create playlists on the Beats Music platform from the "Sentence" feature. Primarily, this allows the user to make that playlist available offline.

## Live Version

You can use the app right now at: [bit.ly/sentencesaver](http://bit.ly/sentencesaver).

## Screenshots

* [iOS web app icon](/doc/sentence_saver_001.jpeg)
* [OAuth screen](/doc/sentence_saver_002.jpg)
* [Create screen](/doc/sentence_saver_003.jpg)
* [Create success](/doc/sentence_saver_004.jpg)
* [Playlist editor](/doc/sentence_saver_005.jpg)

## Run Your Own Copy

1. Clone the repo.
2. Install [leiningen](https://github.com/technomancy/leiningen).
3. Run the following commands in the app directory:

        lein uberjar

4. Once you have the jar file, you can run the jar with:

        java -jar [path to standalone jar given by the previous command.]


## License

Copyright © 2014 Mike Flynn

Distributed under the Eclipse Public License, the same as Clojure.
