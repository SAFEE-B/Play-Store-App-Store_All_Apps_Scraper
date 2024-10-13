const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const gplay = require('google-play-scraper');

let devs = [];
let app_ids = [];
let apps = [];

// List of supported country codes (ISO 3166-1 Alpha-2 codes)
const supportedCountries = ["af", "al", "dz", "ad", "ao", "ag", "ar", "am", "au", "at", "az", "bs", "bh", "bd", "bb", "by", "be", "bz", "bj", "bt", "bo", "ba", "bw", "br", "bn", "bg", "bf", "bi", "cv", "kh", "cm", "ca", "cf", "td", "cl", "cn", "co", "km", "cg", "cr", "hr", "cu", "cy", "cz", "cd", "dk", "dj", "dm", "do", "ec", "eg", "sv", "gq", "er", "ee", "sz", "et", "fj", "fi", "fr", "ga", "gm", "ge", "de", "gh", "gr", "gd", "gt", "gn", "gw", "gy", "ht", "hn", "hu", "is", "in", "id", "ir", "iq", "ie", "il", "it", "jm", "jp", "jo", "kz", "ke", "ki", "kw", "kg", "la", "lv", "lb", "ls", "lr", "ly", "li", "lt", "lu", "mg", "mw", "my", "mv", "ml", "mt", "mh", "mr", "mu", "mx", "fm", "md", "mc", "mn", "me", "ma", "mz", "mm", "na", "nr", "np", "nl", "nz", "ni", "ne", "ng", "kp", "mk", "no", "om", "pk", "pw", "ps", "pa", "pg", "py", "pe", "ph", "pl", "pt", "qa", "ro"
]; 

// Utility function to delay execution
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
    let categories = Object.values(gplay.category);
    let collections = Object.values(gplay.collection);

    let responses = [];

    for (let category of categories) {
        for (let collection of collections) {
            let response = gplay.list({
                category: category,
                collection: collection,
                num: 1000,
                country: country  
            });

            responses.push(response);
        }
    }

    let results = await Promise.allSettled(responses);

    for (let result of results) {
        if (result.status === 'fulfilled') {
            for (let app of result.value) {
                let app_id = app.appId;
                let dev = app.developer;

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

    for (let i = 0; i < devs.length; i += 250) {
        let dev_group = devs.slice(i, i + 250);
        let dev_responses = [];

        for (let dev of dev_group) {
            let response = gplay.developer({
                devId: dev,
                num: 1000,
                country: country,  // Country-specific search
            });

            dev_responses.push(response);
        }

        let dev_results = await Promise.allSettled(dev_responses);

        for (let result of dev_results) {
            if (result.status === 'fulfilled') {
                for (let app of result.value) {
                    let app_id = app.appId;

                    if (!app_ids.includes(app_id)) {
                        app_ids.push(app_id);
                    }
                }
            }
        }

        solved_devs += dev_group.length;
        console.log(`Solved ${solved_devs} devs. Unique apps for country ${country}: ` + app_ids.length);
    }
}

async function getSpecificApps(country) {
    let solved_apps = 0;

    for (let i = 0; i < app_ids.length; i += 10000) {
        apps = [];

        // Create a dynamic CSV writer for each batch and country
        const csvWriter = createCsvWriter({
            path: `gplay/${country}_apps_${i / 10000}.csv`, // Dynamic naming with country
            header: [
                { id: 'appId', title: 'App ID' },
                { id: 'title', title: 'Title' },
                { id: 'description', title: 'Description' },
                { id: 'summary', title: 'Summary' },
                { id: 'installs', title: 'Installs' },
                { id: 'minInstalls', title: 'Min Installs' },
                { id: 'maxInstalls', title: 'Max Installs' },
                { id: 'score', title: 'Score' },
                { id: 'ratings', title: 'Ratings' },
                { id: 'reviews', title: 'Reviews' },
                { id: 'price', title: 'Price' },
                { id: 'free', title: 'Free' },
                { id: 'currency', title: 'Currency' },
                { id: 'developer', title: 'Developer' },
                { id: 'developerEmail', title: 'Developer Email' },
                { id: 'developerWebsite', title: 'Developer Website' },
                { id: 'developerAddress', title: 'Developer Address' },
                { id: 'privacyPolicy', title: 'Privacy Policy' },
                { id: 'genre', title: 'Genre' },
                { id: 'icon', title: 'Icon' },
                { id: 'headerImage', title: 'Header Image' },
                { id: 'screenshots', title: 'Screenshots' },
                { id: 'adSupported', title: 'Ads Supported' },
                { id: 'containsAds', title: 'Contains Ads' },
                { id: 'updated', title: 'Updated' },
                { id: 'version', title: 'Version' },
                { id: 'recentChanges', title: 'Recent Changes' },
                { id: 'editorsChoice', title: 'Editors Choice' },
                { id: 'url', title: 'URL' },
            ]
        });

        for (let j = i; j < i + 10000 && j < app_ids.length; j += 250) {
            let app_group = app_ids.slice(j, j + 250);
            let app_responses = [];

            for (let app_id of app_group) {
                let response = gplay.app({
                    appId: app_id,
                    country: country  // Country-specific search
                });

                app_responses.push(response);
            }

            let app_results = await Promise.allSettled(app_responses);

            for (let result of app_results) {
                if (result.status === 'fulfilled') {
                    const appDetails = result.value;
                    apps.push({
                        appId: appDetails.appId,
                        title: appDetails.title,
                        description: appDetails.description,
                        summary: appDetails.summary,
                        installs: appDetails.installs,
                        minInstalls: appDetails.minInstalls,
                        maxInstalls: appDetails.maxInstalls,
                        score: appDetails.score,
                        ratings: appDetails.ratings,
                        reviews: appDetails.reviews,
                        price: appDetails.price,
                        free: appDetails.free,
                        currency: appDetails.currency,
                        developer: appDetails.developer,
                        developerEmail: appDetails.developerEmail,
                        developerWebsite: appDetails.developerWebsite,
                        developerAddress: appDetails.developerAddress,
                        privacyPolicy: appDetails.privacyPolicy,
                        genre: appDetails.genre,
                        icon: appDetails.icon,
                        headerImage: appDetails.headerImage,
                        screenshots: appDetails.screenshots.join(', '), // Convert array to comma-separated string
                        adSupported: appDetails.adSupported ? 'Yes' : 'No',
                        containsAds: appDetails.containsAds ? 'Yes' : 'No',
                        updated: appDetails.updated,
                        version: appDetails.version,
                        recentChanges: appDetails.recentChanges,
                        editorsChoice: appDetails.editorsChoice ? 'Yes' : 'No',
                        url: appDetails.url,
                    });
                }
            }

            solved_apps += app_group.length;
            console.log(`Solved ${solved_apps} apps for country ${country}. Apps: ` + apps.length);
        }

        // Write to a separate CSV after collecting each batch of apps
        await csvWriter.writeRecords(apps)
            .then(() => {
                console.log(`Written to CSV for apps batch ${(i / 10000)} in country ${country}`);
            })
            .catch(err => {
                console.error(`Error writing to CSV for country ${country}:`, err);
            });
    }
}

async function main() {
    // Get country code from command-line argument
    const country = process.argv[2];

    if (!country || !supportedCountries.includes(country.toLowerCase())) {
        console.error(`Invalid or missing country code. Supported countries: ${supportedCountries.join(', ')}`);
        return;
    }

    devs = [];
    app_ids = [];
    apps = [];
    console.log(`Starting data collection for country: ${country}`);

    await timed(() => getGeneralApps(country));

    console.log(`Unique apps for ${country}: ` + app_ids.length);
    console.log(`Unique devs for ${country}: ` + devs.length);

    await timed(() => getDeveloperApps(country));

    console.log(`Unique apps for ${country} after developer search: ` + app_ids.length);

    await timed(() => getSpecificApps(country));

    console.log(`Completed data collection for country: ${country}`);
}

(async () => {
    await main();
})();
