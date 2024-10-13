# google-play-scraper-All_Apps_Retrieval


**This is the Scraper that returns all the availabe apps in a country. **

**Goole-Play:**
It is based on the google-play-scraper api.

Data is saved in csv format with 10000 apps/file

Installing Libraries(in the project folder):

npm install google-play-scraper

npm install csv-writer

How to run:

make folder "gplay" in the base directory(mkdir gplay)

node gplay_scrape.js (country's code)

eg: node gplay_scrape.js us


**Apple-Store:**
It is based on the app-store-scraper api.

Data is saved in csv format with 10000 apps/file

Installing Libraries(in the project folder):

npm install app-store-scraper

npm install csv-writer(if not installed for google-play-store already)

How to run:

make folder "applestore" in the base directory(mkdir applestore)

node apple_scrape.js (country's code)

eg: node apple_scrapee.js us

(The apple store blocks us when we send lots of requests quickly, so we add delay between consecutive requests. It takes more time, but gets the job done)


**Basic Working Structure:**

We first get app ids by searching by category and collection.

The we get all the developer ids and search and add app ids by each developer

Now, we have all the appIDs, so we make requests over each appId to get its details

A dynamic csv writer writes to a file after 10000 apps or when all apps gets retrieved


For more details on the APIs being used, these are their respositories:
https://github.com/facundoolano/google-play-scraper
https://github.com/facundoolano/app-store-scraper

