$(function() {
    "use scrict";

    function parseUriQuery(query) {
        var parts = /\??(.*)/.exec(query)[1].split("&");
        var pairs = $.map(parts, function(part) {
            var index = part.indexOf("=");
            if(index >= 0) {
                key = part.substring(0, index);
                value = part.substring(index + 1);
                return $.map([key, value], decodeURIComponent);
            }
        });

        // I don't care about repeating keys
        var parsed = {};
        for(var i = 0; i < pairs.length; i+= 2) {
            parsed[pairs[i]] = pairs[i + 1];
        }
        return parsed;
    }
    window.parseUriQuery = parseUriQuery;

    function extend(cls, supercls, props) {
        cls.prototype = Object.create(supercls.prototype, props);
        cls.super = supercls;
        return cls;
    }

    function assert(condition) {
        if(!condition) {
            console.assert(condition, [].slice.call(arguments, 1));
            throw new Error("Assertion Failed");
        }
    }


    function View(options) {
        this.el = options.el || document.createElement("div");
        assert(this.el instanceof Element, "el must be an Element", this.el);
        this.$el = $(this.el);
    }


    function CudlViewerView(options) {
        CudlViewerView.super.call(this, options);

        this.viewer = null;
        this.metadata = null;
        // OpenSeaDragon seems to need a unique ID for each instance
        this.hash = "cudl-player-" + CudlViewerView._hash++;

        options = $.extend({}, CudlViewerView.DEFAULT_OPTIONS, options);

        this.cudl = options.cudl;

        options.metadata.done($.proxy(this.onMetadataAvailable, this));
    }
    extend(CudlViewerView, View);

    CudlViewerView._hash = 1;

    CudlViewerView.DEFAULT_OPTIONS = {
        cudl: new CudlService(),
        metadata: null,
        imageNumber: 1
    };

    $.extend(CudlViewerView.prototype, {
        onMetadataAvailable: function onMetadataAvailable(metadata) {
            this.metadata = metadata;
            this.createViewer();
        },

        createViewer: function createViewer() {
            this.viewer = OpenSeadragon({
                element: this.el,
                hash: this.hash,
                tileSources: this.getTileSources(),
                prefixUrl: "/images/viewer/",
                showNavigationControl: false,
                showNavigator: false,
                showSequenceControl: false
            });
        },

        getTileSources: function getTileSources() {
            var cudl = this.cudl;
            return $.map(this.metadata.getPages(), function(page) {
                return cudl.getDziUrl(page.displayImageURL);
            });
        }
    });

    /**
     * Join items with and for the last element, and commas for the rest.
     * @param items An array of items
     * @param [options]
     * @param [options.html] If true output text nodes as separators in an
     *        array.
     * @returns {Array|String} A joined string or an array if options.html
     *          is true.
     */
    function commaAndJoin(items, options) {
        options = $.extend({}, commaAndJoin.DEFAULT_OPTIONS, options);

        var pieces = [];
        var sep;
        for(i in items) {
            pieces.push(items[i]);

            if(i < items.length - 2) sep = ", ";
            else if(i == items.length - 2) sep = " and ";
            else continue;

            if(options.html) {
                sep = document.createTextNode(sep);
            }

            pieces.push(sep);
        }

        if(options.html) return pieces;
        return joined.join("");
    }
    commaAndJoin.DEFAULT_OPTIONS = {
        html: false,
        comma: ", ",
        and: " and "
    };

    var CudlMetadataView = extend(function CudlMetadataView(options) {
        options = $.extend({}, CudlMetadataView.DEFAULT_OPTIONS, options);
        CudlMetadataView.super.call(this, options);

        this.template = options.template;
        this.metadata = null;

        var futureMetadata = options.metadata;
        futureMetadata.done($.proxy(this.onMetadataAvailable, this));
    }, View);

    CudlMetadataView.DEFAULT_OPTIONS = {
        template: $("#cudl-metadata-template")
    };

    $.extend(CudlMetadataView.prototype, {
        renderTemplate: function renderTemplate() {
            var md = this.metadata;
            var $el = $("<div>").html($(this.template).text());

            $el.find(".cudl-metadata-title").text(md.getTitle());
            $el.find(".cudl-metadata-authors").append(this.renderAuthors());
            $el.find(".cudl-metadata-abstract").html(md.getAbstract());

            return $el.children();
        },

        renderAuthors: function renderAuthors() {
            var authors = this.metadata.getAuthors();
            var authorElements = $.map(authors, function(author) {
                return $("<span class=\"cudl-author\">")
                    .text(author.shortForm)[0];
            });

            if(!authorElements.length) {
                return $();
            }

            return $([document.createTextNode("by ")])
                .add(commaAndJoin(authorElements, {html: true}));
        },

        render: function render() {
            this.$el.empty().append(this.renderTemplate());
        },

        onMetadataAvailable: function onMetadataAvailable(metadata) {
            this.metadata = metadata;
            this.render();
        }
    });


    function CudlService(options) {
        options = $.extend({}, CudlService.DEFAULT_OPTIONS, options);
        this.metadataUrlPrefix = options.metadataUrlPrefix;
        this.metadataUrlSuffix = options.metadataUrlSuffix;
        this.dziUrlPrefix = options.dziUrlPrefix;
    }

    CudlService.DEFAULT_OPTIONS = {};

    $.extend(CudlService.prototype, {
        getDziUrl: function getDziUrl(path) {
            return this.dziUrlPrefix + path;
        },

        getMetadataUrl: function getMetadataUrl(id) {
            return this.metadataUrlPrefix +
                encodeURIComponent(id) + this.metadataUrlSuffix;
        },

        /**
         * Get a promise containing the player's item's JSON metadata.
         */
        getJsonMetadata: function getJsonMetadata(id) {
            var url = this.getMetadataUrl(id);

            return $.ajax({
                url: url,
                dataType: "json"
            }).then(
                function(data, textStatus, xhr) {
                    return data;
                },
                function(xhr, textStatus, errorThrown) {
                    console.error(
                        "Error fetching metadata from: " + url, arguments);
                    return "Unable to fetch metadata from CUDL.";
                }
            );
        },

        getMetadata: function getMetadata(id) {
            return this.getJsonMetadata(id)
                .then($.proxy(this.metadataFromJson, this));
        },

        metadataFromJson: function metadataFromJson(json) {
            return new CudlMetadata(json);
        }
    });

    function CudlMetadata(json) {
        this.json = json;
        this.descriptionMetadataIndex =
            this.indexDescriptionMetadata(this.json);
    }
    $.extend(CudlMetadata.prototype, {
        indexDescriptionMetadata: function indexDescriptionMetadata(json) {
            var index = {};
            var descs = json.descriptiveMetadata;
            for(i in descs) {
                index[descs[i].ID] = descs[i];
            }
            return index;
        },

        getPages: function getPages() {
            return this.json.pages;
        },

        getDescription: function getDescription(id) {
            return this.descriptionMetadataIndex[id];
        },

        getPrimaryStructure: function getPrimaryStructure() {
            var structure = this.json.logicalStructures[0];
            var lastPage = this.json.numberOfPages;

            // I'm assuming that the first logical structure always covers all
            // the item's pages.
            assert(structure.startPagePosition === 1, structure);
            assert(structure.endPagePosition === lastPage, structure);
            return structure;
        },

        getPrimaryDescription: function getPrimaryDescription() {
            var primaryStructure = this.getPrimaryStructure();
            return this.getDescription(primaryStructure.descriptiveMetadataID);
        },

        getTitle: function getTitle() {
            return this.getPrimaryDescription().title.displayForm;
        },

        getAuthors: function getAuthors() {
            var authors = this.getPrimaryDescription().authors;
            return (authors && authors.value) || [];
        },

        getAbstract: function getAbstract() {
            var abstract = this.getPrimaryDescription().abstract;
            return (abstract && abstract.displayForm) || "";
        }
    });

    function getItemId() {
        return parseUriQuery(window.location.search).item
            || "PR-01890-00011-00067"; // The book of bosh!
    }

    var cudl = new CudlService({
        metadataUrlPrefix: "http://localhost:3000/v1/metadata/json/",
        metadataUrlSuffix: "",
        dziUrlPrefix: "http://cudl.lib.cam.ac.uk"
    });

    var futureMetadata = cudl.getMetadata(getItemId());

    var viewerView = new CudlViewerView({
        el: $(".cudl-viewer-player")[0],
        cudl: cudl,
        metadata: futureMetadata
    });

    var metadataView = new CudlMetadataView({
        el: $(".cudl-viewer-metadata")[0],
        metadata: futureMetadata
    });
});
