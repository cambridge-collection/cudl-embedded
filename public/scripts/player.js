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


    var CudlImageNumberView = extend(function CudlImageNumberView(options) {
        CudlImageNumberView.super.call(this, options);

        this.viewerModel = options.viewerModel;
        this.$imgCurrent = this.$el.find(".cudl-img-current");

        $(this.viewerModel).on(
            "change:metadata", $.proxy(this.onMetadataChanged, this));
        $(this.viewerModel).on(
            "change:imageNumber", $.proxy(this.onImageNumberChanged, this));

        this.$el
            .on("change", ".cudl-img-current",
                $.proxy(this.onImageNumberEdited, this))
            .on("click", ".cudl-btn-img-prev",
                $.proxy(this.incrementImageNumber, this, -1))
            .on("click", ".cudl-btn-img-next",
                $.proxy(this.incrementImageNumber, this, 1));

    }, View);
    $.extend(CudlImageNumberView.prototype, {
        onMetadataChanged: function onMetadataChanged() {
            this.$el.find(".cudl-img-last").text(this.viewerModel.getImageCount());
        },

        onImageNumberChanged: function onImageNumberChanged() {
            this.$imgCurrent.val(this.viewerModel.getImageNumber());
        },

        onImageNumberEdited: function onImageNumberEdited() {
            this._tryToSetImageNumber(parseInt(this.$imgCurrent.val(), 10));
        },

        incrementImageNumber: function incrementImageNumber(count) {
            this._tryToSetImageNumber(
                this.viewerModel.getImageNumber() + count);
        },

        _tryToSetImageNumber: function _tryToSetImageNumber(newNumber) {
            // Ensure the new number is valid
            if(isNaN(newNumber) || newNumber < 1 ||
                newNumber > this.viewerModel.getImageCount()) {
                newNumber = this.viewerModel.getImageNumber();
            }
            // Also resets the input to a valid number if it was edited to be
            // invalid
            this.viewerModel.setImageNumber(newNumber);
        }
    });


    var CudlViewerButtonsView = extend(function CudlViewerButtonsView(options) {
        CudlViewerButtonsView.super.call(this, options);

        this.viewerView = options.viewerView;

        this.bindEvents();
    }, View);
    $.extend(CudlViewerButtonsView.prototype, {
        bindEvents: function bindEvents() {
            events = {
                ".cudl-btn-rotate-right": $.proxy(this.rotate, this, 1),
                ".cudl-btn-rotate-left": $.proxy(this.rotate, this, -1),
                ".cudl-btn-expand": $.proxy(this.zoom, this, "in"),
                ".cudl-btn-compress": $.proxy(this.zoom, this, "out")
            };
            for(event in events) {
                this.$el.on("click", event, events[event]);
            }
        },

        rotate: function rotate(direction) {
            var viewer = this.viewerView.getViewer();
            var viewport = viewer.viewport;

            viewport.setRotation(viewport.getRotation() + 90 * direction);
        },

        zoom: function zoom(direction) {
            var viewer = this.viewerView.getViewer();
            var viewport = viewer.viewport;
            var delta;

            if(direction === "in") {
                delta = 0.2;
            }
            else {
                delta = -0.2;
            }
            viewport.zoomTo(viewport.getZoom() * (1 + delta));
            viewport.applyConstraints();
        }
    });



    function CudlViewerView(options) {
        CudlViewerView.super.call(this, options);

        this.viewerModel = options.viewerModel;
        if(!this.viewerModel) {
            throw new ReferenceError("No options.viewerModel provided");
        }

        $(this.viewerModel)
            .on("change:metadata", $.proxy(this.onMetadataAvailable, this))
            .on("change:imageNumber", $.proxy(this.onImageNumberChanged, this));

        this.viewer = null;
        // OpenSeaDragon seems to need a unique ID for each instance
        this.hash = "cudl-player-" + CudlViewerView._hash++;

        this.cudlService = this.viewerModel.getCudlService();
    }
    extend(CudlViewerView, View);

    CudlViewerView._hash = 1;

    $.extend(CudlViewerView.prototype, {
        onMetadataAvailable: function onMetadataAvailable() {
            this.metadata = this.viewerModel.getMetadata();
            this.createViewer();
        },

        getViewer: function getViewer() {
            return this.viewer;
        },

        onImageNumberChanged: function onImageNumberChanged() {
            // Our page numbers are 1-based, the Viewer's are 0-based.
            var number = this.viewerModel.getImageNumber() - 1;
            if(this.viewer !== null
                    && this.viewer.currentPage() !== number) {
                this.viewer.goToPage(number);
            }
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
            var cudl = this.cudlService;
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

        this.viewerModel = options.viewerModel;
        $(this.viewerModel).on(
            "change:metadata", $.proxy(this.onMetadataAvailable, this));

        this.$el.on("click", ".cudl-metadata-toggle-btn",
            $.proxy(this.onShowHideToggled, this));
    }, View);

    CudlMetadataView.DEFAULT_OPTIONS = {
        template: $("#cudl-metadata-template")
    };

    $.extend(CudlMetadataView.prototype, {
        onShowHideToggled: function onShowHideToggled(e) {
            this.$el.toggleClass("hidden");
        },

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
            this.$el.find(".cudl-viewer-metadata-container")
                .empty().append(this.renderTemplate());
        },

        onMetadataAvailable: function onMetadataAvailable() {
            this.metadata = this.viewerModel.getMetadata();
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

    function CudlViewerModel(options) {
        options = $.extend({}, CudlViewerModel.DEFAULT_OPTIONS, options);

        this.cudlService = options.cudlService;
        this.metadata = null;
        this.imageNumber = options.imageNumber;

        options.metadata.done($.proxy(this.onMetadataAvailable, this));
        options.metadata;
    }
    CudlViewerModel.DEFAULT_OPTIONS = {
        cudlService: new CudlService(),
        metadata: null,
        imageNumber: 1
    }
    $.extend(CudlViewerModel.prototype, {
        onMetadataAvailable: function onMetadataAvailable(metadata) {
            this.metadata = metadata;


            // Ensure the page number is within bounds
            var imageNumber = this.imageNumber;
            try {
                this.setImageNumber(this.imageNumber, true);
            }
            catch(e) {
                // Default the image number if it was invalid
                imageNumber = 1;
            }

            $(this).trigger("change:metadata", metadata);
            // Set the number again to re-trigger the change event
            this.setImageNumber(imageNumber);
        },

        getImageNumber: function getImageNumber() {
            return this.imageNumber;
        },

        setImageNumber: function setImageNumber(image, silent) {
            if(image < 1 || image > this.getImageCount()) {
                throw new RangeError("image out of range: " + image);
            }
            this.imageNumber = image;

            if(silent !== true) {
                $(this).trigger("change:imageNumber");
            }
        },

        getImageCount: function getImageCount() {
            return this.getMetadata().getPages().length;
        },

        getMetadata: function getMetadata() {
            return this.metadata;
        },

        getCudlService: function getCudlService() {
            return this.cudlService;
        }

    });

    function getItemId() {
        return parseUriQuery(window.location.search).item
            || "PR-01890-00011-00067"; // The book of bosh!
    }

    function getStartPage() {
        return parseInt(parseUriQuery(window.location.search).page, 10) || 1;
    }

    var cudlService = new CudlService({
        metadataUrlPrefix: "http://localhost:3000/v1/metadata/json/",
        metadataUrlSuffix: "",
        dziUrlPrefix: "http://cudl.lib.cam.ac.uk"
    });

    var futureMetadata = cudlService.getMetadata(getItemId());

    var cudlViewerModel = new CudlViewerModel({
        cudlService: cudlService,
        metadata: futureMetadata,
        imageNumber: getStartPage()
    });

    var viewerView = new CudlViewerView({
        el: $(".cudl-viewer-player")[0],
        viewerModel: cudlViewerModel
    });

    var metadataView = new CudlMetadataView({
        el: $(".cudl-viewer-metadata")[0],
        viewerModel: cudlViewerModel
    });

    var imageNumberView = new CudlImageNumberView({
        el: $(".cudl-page-position")[0],
        viewerModel: cudlViewerModel
    });

    var viewerButtonsView = new CudlViewerButtonsView({
        el: $(".cudl-viewer-buttons")[0],
        viewerView: viewerView
    });
});
