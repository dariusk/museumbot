# met (Met Stuff)

This is a twitter bot that tweets a random item from the Met's open access collection.

The `index.js` file only runs once. It runs a search on the Met's collection through a basic HTTP request, since they don't have an API. I randomize the paging in the URL, which returns a random page of search results, then parse the result through Cheerio to grab the HTML. Then a second request gets the high res image for the item. There's also error checking in case there's no image for an item, or it isn't open access. It'll try again if it hits an error, and continue until it successfully tweets/posts.

I run this on a cron job on a server.

## License
Copyright (c) 2014 Darius Kazemi  
Licensed under the MIT license.
