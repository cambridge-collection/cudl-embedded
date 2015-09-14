// These are loaded for their side-effects
import 'google-analytics';
import 'modernizr.custom';

import $ from 'jquery';


$(function() {
    let config = null;
    try {
        config = JSON.parse($("#config").text());
    }
    catch(e) {
        throw new Error("Unable to load viewer config: " + e);
    }

    if(config !== null) {
        // player.js needs to be loaded after the DOM is loaded
        require('./player.js').initFromConfig(config);
    }
});
