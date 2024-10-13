const fs = require('fs');
const store = require('app-store-scraper');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

let devs = [];
let app_ids = [];
let apps = [];
let countryList=["af", "al", "dz", "ad", "ao", "ag", "ar", "am", "au", "at", "az", "bs", "bh", "bd", "bb", "by", "be", "bz", "bj", "bt", "bo", "ba", "bw", "br", "bn", "bg", "bf", "bi", "cv", "kh", "cm", "ca", "cf", "td", "cl", "cn", "co", "km", "cg", "cr", "hr", "cu", "cy", "cz", "cd", "dk", "dj", "dm", "do", "ec", "eg", "sv", "gq", "er", "ee", "sz", "et", "fj", "fi", "fr", "ga", "gm", "ge", "de", "gh", "gr", "gd", "gt", "gn", "gw", "gy", "ht", "hn", "hu", "is", "in", "id", "ir", "iq", "ie", "il", "it", "jm", "jp", "jo", "kz", "ke", "ki", "kw", "kg", "la", "lv", "lb", "ls", "lr", "ly", "li", "lt", "lu", "mg", "mw", "my", "mv", "ml", "mt", "mh", "mr", "mu", "mx", "fm", "md", "mc", "mn", "me", "ma", "mz", "mm", "na", "nr", "np", "nl", "nz", "ni", "ne", "ng", "kp", "mk", "no", "om", "pk", "pw", "ps", "pa", "pg", "py", "pe", "ph", "pl", "pt", "qa", "ro"
]
// Utility function to introduce delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function timed(func) {
    let start = new Date().getTime();
    await func();
    let end = new Date().getTime();
    console.log('Time: ' + (end - start) / 1000 + 's');
}

async function getGeneralApps(country) {
    console.log("Getting General Apps");
    let categories = Object.values(store.category);
    console.log("Categories Fetched");
    let collections = Object.values(store.collection);
    console.log("Collections Fetched");

    let responses = [];
    console.log(`Doing Category/Collection Search`);
    for (let category of categories) {
        for (let collection of collections) {
            let response = store.list({
                category: category,
                collection: collection,
                country: country, // Country-specific search
                num: 200,
                throttle: 5
            });
            responses.push(response);
        }
    }

    let results = await Promise.allSettled(responses);

    for (let result of results) {
        if (result.status === 'fulfilled') {
            for (let app of result.value) {
                let app_id = app.appId;
                let dev = app.developerId;

                if (!app_ids.includes(app_id)) {
                    app_ids.push(app_id);
                }
                if (!devs.includes(dev)) {
                    devs.push(dev);
                }
            }
        }
    }
}

async function getDeveloperApps(country) {
    let solved_devs = 0;
    let lost = 0;

    for (let i = 0; i < devs.length; i++) {
        const dev = devs[i];

        try {
            let devApps = await store.developer({
                devId: dev,
                country: country, // Country-specific search
                num: 200,
            });

            for (let app of devApps) {
                let app_id = app.appId;

                if (!app_ids.includes(app_id)) {
                    app_ids.push(app_id);
                }
            }

        } catch (error) {
            lost++;
        }

        solved_devs++;

        // Log progress every 100 developers or when all developers are processed
        if (solved_devs % 100 === 0 || solved_devs === devs.length) {
            console.log(`Processed Developers: ${solved_devs}  Total Successful Apps Till Now:  ${app_ids.length}`);
        }

        // Introduce a delay to avoid being blocked
        await delay(250);
    }
}

async function getSpecificApps(country) {
    let solved_apps = 0;
    let lost = 0;

    for (let i = 0; i < app_ids.length; i++) {
        const app_id = app_ids[i];
        try {
            let appDetails = await store.app({ appId: app_id, country: country }); // Country-specific search
            apps.push({
                appId: appDetails.appId,
                title: appDetails.title,
                url: appDetails.url,
                description: appDetails.description,
                icon: appDetails.icon,
                genres: appDetails.genres.join(', '),
                genreIds: appDetails.genreIds.join(', '),
                primaryGenre: appDetails.primaryGenre,
                primaryGenreId: appDetails.primaryGenreId,
                contentRating: appDetails.contentRating,
                languages: appDetails.languages.join(', '),
                size: appDetails.size,
                requiredOsVersion: appDetails.requiredOsVersion,
                released: appDetails.released,
                updated: appDetails.updated,
                releaseNotes: appDetails.releaseNotes,
                version: appDetails.version,
                price: appDetails.price,
                currency: appDetails.currency,
                free: appDetails.free,
                developerId: appDetails.developerId,
                developer: appDetails.developer,
                developerUrl: appDetails.developerUrl,
                developerWebsite: appDetails.developerWebsite || 'N/A',
                score: appDetails.score,
                reviews: appDetails.reviews,
                currentVersionScore: appDetails.currentVersionScore,
                currentVersionReviews: appDetails.currentVersionReviews,
                screenshots: appDetails.screenshots.join(' | '),
                ipadScreenshots: appDetails.ipadScreenshots.join(' | '),
                appletvScreenshots: appDetails.appletvScreenshots.join(' | '),
                supportedDevices: appDetails.supportedDevices.join(', '),
                inAppPurchases: appDetails.offersIAP ? 'Yes' : 'No',
            });

            // Introduce a delay between each request (500 ms in this case)
            await delay(500);
        } catch (error) {
            lost++;
        }

        solved_apps++;
        console.log(`Processed Apps: ${solved_apps}   Lost Apps: ${lost}`);

        // Every 10,000 apps or when the last app is processed, write the data to a CSV
        if (solved_apps % 10000 === 0 || solved_apps === app_ids.length) {
            console.log(`Writing batch of apps to CSV. Solved ${solved_apps} apps.`);
            await writeToCsv(solved_apps, country);
            apps = []; // Clear the apps array after writing to CSV
        }
    }
}

// CSV writer function
async function writeToCsv(batchNumber, countryName) {
    const csvWriter = createCsvWriter({
        path: `applestore/apple_store_apps_${countryName}_batch_${Math.floor(batchNumber / 10000)}.csv`, // Include countryName in the filename
        header: [
            { id: 'appId', title: 'App ID' },
            { id: 'title', title: 'Title' },
            { id: 'url', title: 'App URL' },
            { id: 'description', title: 'Description' },
            { id: 'icon', title: 'Icon URL' },
            { id: 'genres', title: 'Genres' },
            { id: 'genreIds', title: 'Genre IDs' },
            { id: 'primaryGenre', title: 'Primary Genre' },
            { id: 'primaryGenreId', title: 'Primary Genre ID' },
            { id: 'contentRating', title: 'Content Rating' },
            { id: 'languages', title: 'Languages' },
            { id: 'size', title: 'Size' },
            { id: 'requiredOsVersion', title: 'Required OS Version' },
            { id: 'released', title: 'Released' },
            { id: 'updated', title: 'Last Updated' },
            { id: 'releaseNotes', title: 'Release Notes' },
            { id: 'version', title: 'Version' },
            { id: 'price', title: 'Price' },
            { id: 'currency', title: 'Currency' },
            { id: 'free', title: 'Free' },
            { id: 'developerId', title: 'Developer ID' },
            { id: 'developer', title: 'Developer' },
            { id: 'developerUrl', title: 'Developer URL' },
            { id: 'developerWebsite', title: 'Developer Website' },
            { id: 'score', title: 'Overall Score' },
            { id: 'reviews', title: 'Reviews' },
            { id: 'currentVersionScore', title: 'Current Version Score' },
            { id: 'currentVersionReviews', title: 'Current Version Reviews' },
            { id: 'screenshots', title: 'Screenshots' },
            { id: 'ipadScreenshots', title: 'iPad Screenshots' },
            { id: 'appletvScreenshots', title: 'Apple TV Screenshots' },
            { id: 'supportedDevices', title: 'Supported Devices' },
            { id: 'inAppPurchases', title: 'In-App Purchases' },
        ]
    });

    try {
        await csvWriter.writeRecords(apps);
        console.log(`Batch ${Math.floor(batchNumber / 10000)} saved to CSV for ${countryName}.`);
    } catch (err) {
        console.error(`Error writing batch ${Math.floor(batchNumber / 10000)} to CSV:`, err);
    }
}

async function main() {
    // Get country code from command-line argument
    const country = process.argv[2];

    if (!country) {
        console.error("Please provide a country code as an argument.");
        return;
    }
    if(!countryList.find(Country=>Country==country)){
        console.error(`Country code ${country} is not supported.`);
        process.exit(1)
    }

    devs = [];
    app_ids = [];
    apps = [];
    console.log(`Starting data collection for country: ${country}`);

    await timed(() => getGeneralApps(country));
    console.log('Unique apps: ' + app_ids.length);
    console.log('Unique devs: ' + devs.length);

    await timed(() => getDeveloperApps(country));
    console.log('Unique apps after developer search: ' + app_ids.length);

    await timed(() => getSpecificApps(country));

    console.log(`Completed data collection for country: ${country}`);
}

(async () => {
    await main();
})();
