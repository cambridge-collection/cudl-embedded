$(function() {
    "use scrict";

    function Player(playerElement, options) {
        this.$playerElement = $(playerElement);

        options = $.extend({}, Player.DEFAULT_OPTIONS, options);

        this.metadataUrlPrefix = options.metadataUrlPrefix;
        this.metadataUrlSuffix = options.metadataUrlSuffix;
        this.imageNumber = options.imageNumber;
        this.itemId = "PR-01890-00011-00067" // The book of bosh!
    };

    Player.DEFAULT_OPTIONS = {
        metadataUrlPrefix: "http://cudl.lib.cam.ac.uk/view/",
        metadataUrlSuffix: ".json",
        imageNumber: 1
    };

    $.extend(Player.prototype, {
        getMetadataUrl: function getMetadataUrl(id) {
            id = id || this.itemId;
            return this.metadataUrlPrefix +
                encodeURIComponent(id) + this.metadataUrlSuffix;
        },

        /**
         * Get a promise containing the player's item's metadata.
         */
        getJsonMetadata: function getJsonMetadata() {
            var metadata = $.Deferred();
            var url = this.getMetadataUrl();

            $.ajax({
                url: url,
                dataType: "json"
            }).done(function(data, textStatus, xhr) {
                metadata.resolve(data);
            }).fail(function(xhr, textStatus, errorThrown) {
                console.error("Error fetching metadata from: " + url, arguments);
                metadata.reject("Unable to fetch metadata from CUDL.");
            })
            
            return metadata.promise();
        },

    });

    var player = new Player($("#player"));
    console.log(player.getJsonMetadata());
});
