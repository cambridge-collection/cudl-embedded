import $ from 'jquery';
import OpenSeadragon from 'openseadragon';
import Modernizr from 'modernizr.custom';


/** Get the number of milliseconds since ~page load. */
var now = (function(){
    if(window.performance && window.performance.now) {
        return $.proxy(window.performance.now, window.performance);
    }

    // IE9 etc
    var start = Date.now();
    return function now() {
        return Date.now() - start;
    };
})();

var isSameOrigin = (function() {
    function normaliseAnchorOriginFields(anchor) {
        // IE doesn't populate implicit fields of relative URLs
        if(anchor.protocol === ":" || !anchor.protocol) {
            anchor.protocol = window.location.protocol;
        }
        if(!anchor.hostname) {
            anchor.hostname = window.location.hostname;
        }
        if(!anchor.port) {
            anchor.port = window.location.port;
        }
    }

    function parseUrl(url) {
        if($.type(url) !== "string") {
            throw new Error("Invalid url: " + url);
        }

        var anchor = document.createElement("a");
        anchor.href = url;
        normaliseAnchorOriginFields(anchor);
        return anchor;
    }

    function origin(parsedUrl) {
        return parsedUrl.protocol + "//" + parsedUrl.hostname + ":" +
            parsedUrl.port;
    }

    /**
     * Check if url is the same origin as base. If not specified, base is
     * the current page's url.
     */
    return function isSameOrigin(url, base) {
        if(!base) {
            base = "" + window.location;
        }

        return origin(parseUrl(url)) === origin(parseUrl(base));
    };
})();

function compose(funcs) {
    return function() {
        var result = arguments;

        for(var i in funcs) {
            var func = funcs[i];
            result = [func.apply(undefined, result)];
        }
        return result[0];
    };
}

function XDomainRequestAjaxTransport(options, jqXHR) {
    this.options = options;
    this.jqXHR = jqXHR;
    this.xdr = new XDomainRequest();
    this.completeCallback = null;
}
$.extend(XDomainRequestAjaxTransport.prototype, {
    onLoad: function onLoad() {
        this.completeCallback(
            200, "success", this.getResponses());
    },

    onError: function onError(message) {
        this.completeCallback(0, message, this.getResponses());
    },

    getResponses: function getResponses() {
        return {text: this.xdr.responseText};
    },

    send: function send(headers, completeCallback) {
        this.completeCallback = completeCallback;

        this.xdr.onload = $.proxy(this.onLoad, this);
        this.xdr.onerror = $.proxy(this.onError, this, "error");
        this.xdr.ontimeout = $.proxy(this.onError, this, "timeout");

        this.xdr.open(this.options.type, this.options.url);
        this.xdr.send(this.options.data);
    },
    abort: function abort() {
        this.xdr.abort();
    }
});
$.extend(XDomainRequestAjaxTransport, {
    canHandle: function canHandle(options) {
        // Handle cross origin requests if the browser does not support
        // CORS and XDomainRequest exists (e.g. IE 8 and 9)
        if(isSameOrigin(options.url) || Modernizr.cors ||
                !window.XDomainRequest) {
            return false;
        }

        // Also, XDomainRequest only supports get and post
        if(!(options.type === "GET" || options.type === "POST")) {
            return false;
        }

        // And it has to be async
        if(!options.async) {
            return false;
        }

        return true;
    },

    handler: function handler(options, originalOptions, jqXHR) {
        if(XDomainRequestAjaxTransport.canHandle(options)) {
            return new XDomainRequestAjaxTransport(options, jqXHR);
        }
    },

    registerTransport: function registerTransport() {
        // +* prepends our handler to the chain for the * (wildcard)
        // datatype.
        $.ajaxTransport("+*", XDomainRequestAjaxTransport.handler);
    }
});

// Add XDomainRequest support to jquery.ajax as an ajax transport method.
XDomainRequestAjaxTransport.registerTransport();

function parseUriQuery(query) {
    var parts = /(?:\?|#)?(.*)/.exec(query)[1].split("&");
    var pairs = $.map(parts, function(part) {
        var index = part.indexOf("=");
        if(index >= 0) {
            let key = part.substring(0, index);
            let value = part.substring(index + 1);
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

var escapeAsHtml = (function() {
    var $div = $("<div>");

    return function escapeAsHtml(text) {
        return $div.text(text).html();
    };
})();

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
    this.setEl(options.el);
}
$.extend(View.prototype, {
    setEl: function setEl(el) {
        this.$el = $(el).first();
        this.el = this.$el[0];
    }
});

function registerListeners(object, listeners) {
    var $obj = $(object);
    for(var event in listeners) {
        $obj.on(event, listeners[event]);
    }
}


var CudlErrorView = extend(function CudlErrorView(options) {
    CudlErrorView.super.call(this, options);

    options = $.extend({}, CudlErrorView.DEFAULT_OPTIONS, options);

    this.title = options.title;
    this.body = options.body;
    this.bodyHtml = options.bodyHtml;
    this.setEl($.parseHTML(options.template.text()));
    this.render();
    this.$el.on("click", ".cudl-btn-close", $.proxy(this.onClose, this));

    $(document).trigger("cudl:dialog:opened", {dialog: this});
}, View);
CudlErrorView.DEFAULT_OPTIONS = {
    title: "Content could not be loaded",
    body: "Please try again later",
    template: $("#cudl-error-template")
};
$.extend(CudlErrorView.prototype, {
    render: function render() {
        this.$el.find("h2 span").text(this.title);

        if(this.bodyHtml) {
            this.$el.find("p").html(this.bodyHtml);
        }
        else {
            this.$el.find("p").text(this.body);
        }
    },

    onClose: function onClose() {
        $(document).trigger("cudl:dialog:closed", {dialog: this});
        this.$el.detach();
    }
});

var CudlFullscreenView = extend(function CudlFullscreenView(options) {
    CudlFullscreenView.super.call(this, options);

    this.$el.on("click", $.proxy(this.onFullscreenClicked, this));
    this.fullscreenElement = $("body")[0];

    if(this.isFullscreenPossible()) {
        $(document).on("webkitfullscreenchange mozfullscreenchange " +
            "fullscreenchange MSFullscreenChange",
            $.proxy(this.onFullscreenChange, this));

        // bootstrap initial state
        this.initialising = true;
        this.onFullscreenChange();
        this.initialising = false;
        this.$el.show();
    }
    else {
        // Disable the fullscreen button as it's not going to work
        this.$el.hide();
    }
}, View);
$.extend(CudlFullscreenView.prototype, {
    onFullscreenClicked: function onFullscreenClicked() {
        if (this.isFullscreen()) {
            this.exitFullscreen();
        }
        else {
            this.enterFullscreen();
        }
    },

    getFirstMethod: function getFirstMethod(obj, methods, _default) {
        for(var i in methods) {
            var method = obj[methods[i]];
            if($.isFunction(method)) {
                return method;
            }
        }
        return _default;
    },

    enterFullscreenMethods: [
        "requestFullscreen",
        "msRequestFullscreen",
        "mozRequestFullScreen",
        "webkitRequestFullscreen"
    ],

    exitFullscreenMethods: [
        "exitFullscreen",
        "msExitFullscreen",
        "mozCancelFullScreen",
        "webkitExitFullscreen"
    ],

    isFullscreenPossible: function isFullscreenPossible() {
        return document.fullscreenEnabled ||
            document.msFullscreenEnabled ||
            document.mozFullScreenEnabled ||
            document.webkitFullscreenEnabled;
    },

    getCurrentFullscreenElement: function getCurrentFullscreenElement() {
        return document.fullscreenElement ||
            document.mozFullScreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement;
    },

    enterFullscreen: function enterFullscreen() {
        var method = this.getFirstMethod(
            this.fullscreenElement, this.enterFullscreenMethods, $.noop);
        method.call(this.fullscreenElement);
    },

    exitFullscreen: function exitFullscreen() {
        var method = this.getFirstMethod(
            document, this.exitFullscreenMethods, $.noop);
        method.call(document);
    },

    isFullscreen: function isFullscreen() {
        return this.getCurrentFullscreenElement() ===
            this.fullscreenElement;
    },

    onFullscreenChange: function onFullscreenChange() {
        var fullscreen = this.isFullscreen();
        this.$el.toggleClass("cudl-fullscreen fa-arrows-alt", !fullscreen);
        this.$el.toggleClass("fa-close", fullscreen);
        $("html").toggleClass("cudl-fullscreen", fullscreen);

        if(!this.initialising) {
            ga("send", "event", "Fullscreen",
                (fullscreen ? "Entered" : "Exited"));
        }
    }
});


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

    this.onMetadataChanged();
}, View);
$.extend(CudlImageNumberView.prototype, {
    onMetadataChanged: function onMetadataChanged() {
        if(this.viewerModel.getMetadata() === null) {
           this.disableInput(true);
        }
        else {
            this.disableInput(false);
            this.$el.find(".cudl-img-last").text(
                this.viewerModel.getImageCount());
        }
    },

    disableInput: function disableInput(isDisabled) {
        this.$el.find("button,input").prop("disabled", !!isDisabled);
    },

    onImageNumberChanged: function onImageNumberChanged() {
        this.$imgCurrent.val(this.viewerModel.getImageNumber());
    },

    onImageNumberEdited: function onImageNumberEdited() {
        this._tryToSetImageNumber(parseInt(this.$imgCurrent.val(), 10));
        // Overwrite any bad input
        this.onImageNumberChanged();
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
        let events = {
            ".cudl-btn-rotate-right": $.proxy(this.rotate, this, 1),
            ".cudl-btn-rotate-left": $.proxy(this.rotate, this, -1),
            ".cudl-btn-expand": $.proxy(this.zoom, this, "in"),
            ".cudl-btn-compress": $.proxy(this.zoom, this, "out")
        };
        for(var event in events) {
            this.$el.on("click", event, events[event]);
        }
    },

    rotate: function rotate(direction) {
        var viewer = this.viewerView.getViewer();
        var viewport = viewer.viewport;

        if(viewport === null)
            return;

        viewport.setRotation(viewport.getRotation() + 90 * direction);
    },

    zoom: function zoom(direction) {
        var viewer = this.viewerView.getViewer(),
            viewport = viewer.viewport,
            delta;

        if(viewport === null)
            return;

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
    this.createViewer();
}
extend(CudlViewerView, View);

CudlViewerView._hash = 1;

$.extend(CudlViewerView.prototype, {
    onMetadataAvailable: function onMetadataAvailable() {
        this.metadata = this.viewerModel.getMetadata();
    },

    getViewer: function getViewer() {
        return this.viewer;
    },

    onImageNumberChanged: function onImageNumberChanged() {
        var number = this.viewerModel.getImageNumber();
        var self = this;
        if(this.viewer !== null) {

            this.viewerModel.getTilesource(number)
                    .done(function(tileSource) {

                // The image number might well change as the tilesource is
                // loading, so only use it if it's not changed.
                if(self.viewerModel.getImageNumber() === number) {
                    self.viewer.open(tileSource);
                }
            });
        }
    },

    /**
     * Event handler for home and open events which sets the initial image
     * position to our desired location. This is required because our
     * transparent UI partially covers the viewer el and we don't want the
     * image to start off underneith it (even though it may be dragged under
     * it later).
     */
    zoomToHome: function zoomToHome(eventName, event) {
        var immediatley = true;
        // A home event is fired as the viewport is created, but before the
        // viewer has the viewport assigned. We handle this by listening
        // for the open event in addition to home events.
        if(eventName === "home") {
            if(this.viewer.viewport === null) {
                return;
            }
            immediatley = event.immediately;
        }

        // Get the area of the viewer element which the image should start
        // in.
        var visiblePixels = this.getViewerElVisiblePixels();
        // Get the viewport coord bounding box to zoom the viewport to in
        // order to place the image into our visible pixels
        var bounds = this.getFitBounds(visiblePixels);
        // Zoom the viewport to our location
        this.viewer.viewport.fitBounds(bounds, immediatley);
    },

    createViewer: function createViewer() {
        this.viewer = OpenSeadragon({
            element: this.el,
            hash: this.hash,
            prefixUrl: "/images/viewer/",
            showNavigationControl: false,
            showNavigator: false,
            showSequenceControl: false
        });

        // Disable OpenSeadragon's keyboard commands as we provide our own
        $(this.viewer.keyboardCommandArea).prop("tabindex", -1);

        // Listen for tilesources being loaded and opened so that we can
        // adjust the initial position of the image to fit our UI.
        this.viewer.addHandler("home",
            $.proxy(this.zoomToHome, this, "home"));
        this.viewer.addHandler("open",
            $.proxy(this.zoomToHome, this, "open"));
    },

    /**
     * Get the bounding box which the image must stay within on initial
     * image load. The coordinates are those of the viewer element (which
     * fills 100% of the viewport).
     */
    getViewerElVisiblePixels: function getViewerElVisiblePixels() {
        var viewerEl = this.el;
        var viewerRect = viewerEl.getBoundingClientRect();

        var top, right, bottom, left;

        // The hardcoded offset values here correspond to the amount the
        // UI overlays the viewer element. It's awkward to calculate the
        // actual values from the page elements, as their position changes
        // depending on state, e.g. whether the sidebar is open/closed.
        if(window.matchMedia && matchMedia("(max-width: 459px)").matches) {
            top = viewerRect.top + 64;
            left = viewerRect.left;
            right = viewerRect.right;
            bottom = viewerRect.height - 10;
        }
        else {
            top = viewerRect.top + 32;
            left = viewerRect.left;
            right = viewerRect.right - 16;
            bottom = viewerRect.height;
        }
        return new OpenSeadragon.Rect(
            left, top, right - left, bottom - top);
    },

    /**
     * Get a bounding rectangle which places the current image entirely
     * within the specified portion of the viewport.
     *
     * The visible area of the image is maximised by filling as much of
     * the width/height as possible.
     *
     * @param {OpenSeadragon.Rect} destPixels the rectangle in the viewer
     *        element's pixel coordinates that the image should be fitted
     *        within.
     * @return {OpenSeadragon.Rect} a rect representing the viewport bounds
     *        that need to be passed to viewport.fitBounds() to place the
     *        image within the screen pixels specified by destPixels.
     */
    getFitBounds: function getFitBounds(destPixels) {
        var viewport = this.viewer.viewport;
        if(viewport === null) {
            throw new Error("viewer has no viewport: is an image loaded?");
        }

        var viewportSizePixels = viewport.getContainerSize();
        var viewportAspect = viewport.getAspectRatio();

        // Openseadragon uses normalised coordinates: image left top is
        // (0, 0). right bottom is (1, (imgHeight/imgWidth));
        var imageHeight = viewport.contentAspectY;
        var imageWidth = 1;

        // The proportion (0-1) of the viewport which is left,top padding
        // and width,height visible
        var offsetXProp = destPixels.x / viewportSizePixels.x,
            offsetYProp = destPixels.y / viewportSizePixels.y,
            visibleHeightProp = destPixels.height / viewportSizePixels.y,
            visibleWidthProp = destPixels.width / viewportSizePixels.x;

        var bounds = new OpenSeadragon.Rect();

        var contentNarrowerThanViewport =
            viewport.contentAspectX < destPixels.getAspectRatio();

        // Narrower, so fit height, center width
        if(contentNarrowerThanViewport) {

            // We need to zoom the viewport such that the image fits into
            // the visible height
            bounds.height = imageHeight / visibleHeightProp;
            bounds.width = bounds.height * viewport.getAspectRatio();
        }
        // Wider, so fit width, center height
        else {

            bounds.width = imageWidth / visibleWidthProp;
            bounds.height = bounds.width / viewport.getAspectRatio();
        }

        // Offset x and y back by the amount of padding and half the
        // available space around the image (to center it).
        bounds.y = 0 - (
            // Top padding
            (bounds.height * offsetYProp) +
            // Centering
            ((bounds.height * visibleHeightProp) - imageHeight) / 2);

        bounds.x = 0 - (
            // Top padding
            (bounds.width * offsetXProp) +
            // Centering
            (((bounds.width * visibleWidthProp) - imageWidth) / 2));

        return bounds;
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
    for(var i in items) {
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
        ga("send", "event", "Metadata",
            (this.isVisible() ? "Closed" : "Opened"));
        this.$el.toggleClass("hidden");
    },

    /**
     * @param {Boolean} open true if the sidebar should be made open, false
     *                  to close it.
     */
    setVisibility: function setVisibility(open) {
        var isVisible = this.isVisible();
        if(isVisible === open) {
            return;
        }
        this.$el.toggleClass("hidden");
    },

    isVisible: function isVisible() {
        return !this.$el.is(".hidden");
    },

    renderTemplate: function renderTemplate() {
        var md = this.metadata;
        var $el = $("<div>").html($(this.template).text());

        var abstract = this.preprocessMetadataHtml(md.getAbstract());
        if(!abstract.length) {
            abstract = "<em>No description available</em>";
        }

        $el.find(".cudl-metadata-title a").text(md.getTitle());
        $el.find(".cudl-metadata-title a")
            .attr("href", this.viewerModel.getItemCudlUrl());
        $el.find(".cudl-metadata-summary").append(this.renderSummary());
        $el.find(".cudl-metadata-abstract").html(abstract);
        $el.find(".cudl-copyright-statement")
            .text(md.getImageCopyrightStatement());

        return $el.children();
    },

    preprocessMetadataHtml: function preprocessMetadataHtml(html) {
        return compose([
            this.stripInlineStyles,
            this.autoSizeEmbededObjects,
            $.proxy(this.fixCudlUrlReferences, this),
            this.changeOnclickToJavascriptUri,
            this.makeExternalLinksTargetBlank
        ])(html);
    },

    changeOnclickToJavascriptUri:
        function changeOnclickToJavascriptUri(html) {
        var anchors = "a[onclick]";
        return $(html).find(anchors).addBack(anchors).each(function(_, a) {
            var $a = $(a);
            $a.text($a.text());
            $a.addClass("cudl-image-link");
            $a.attr("title", "Jump to page in this item");
        }).end().end();
    },

    stripInlineStyles: function stripInlineStyles(html) {
        var styled = $(html).find("[style]").addBack("[style]")
            .filter(":not(img)");

        // For debugging purposes, list the removed styles
        var styles = $.map(styled, function(x) {
            return $(x).attr("style");
        });
        if(styles.length) {
            console.info("removed styles:", styles);
        }

        return styled.removeAttr("style").end().end().end();
    },

    fixCudlUrlReferences: function fixCudlUrlReferences(html) {
        var cudlService = this.viewerModel.getCudlService();
        html = $(html);

        // Fix img src attrs with only a path
        var imgs = "img[src^='/']";
        html.find(imgs).addBack(imgs).each(function (_, img) {
            img.src = cudlService.getAbsoluteUrl(
                $(img).attr("src"));
        });

        // Fix a href attrs with only a path
        var anchors = "a[href^='/']";
        html.find(anchors).addBack(anchors).each(function(_, a) {
            a.href = cudlService.getAbsoluteUrl($(a).attr("href"));
        });
        return html;
    },

    makeExternalLinksTargetBlank: function makeExternalLinksTargetBlank(
        html) {

        html = $(html);
        var anchors = "a:not([href^='javascript:'])";
        html.find(anchors).addBack(anchors).attr("target", "_blank");
        return html;
    },

    /**
     * Wrap object/iframe elements under el to allow them to be sized
     * automatically to the width of the sidebar.
     * @param el The element containing object/iframe elements.
     */
    autoSizeEmbededObjects: function(el) {
        return $(el)
            .find("iframe,object")
            .wrap("<div class=\"cudl-embedded-object-wrapper\"></div>")
            .end();
    },

    renderSummary: function renderAuthors() {
        var authors = this.metadata.getAuthors();
        var authorElements = $.map(authors, function(author) {
            return $("<span class=\"cudl-author\">")
                .text(author.shortForm)[0];
        });

        var summaryHtml;
        if(!authorElements.length) {
            summaryHtml = $();
        }
        else {
            summaryHtml = $([document.createTextNode("by ")])
                .add(commaAndJoin(authorElements, {html: true}));
        }

        var date = this.metadata.getCreationDate();
        var dateSeparator = "created ";
        var dateTitle = "Creation date";

        if(!date) {
            date = this.metadata.getPublicationDate();
            dateTitle = "Publication date";
            dateSeparator = "published ";
        }

        if(date) {
            var dateEl = $("<strong class='cudl-date'>")
                .attr("title", dateTitle)
                .text(date)[0];

            if(summaryHtml.length) {
                dateSeparator = ", " + dateSeparator;
            }

            summaryHtml = summaryHtml.add([
                document.createTextNode(dateSeparator), dateEl]);
        }

        return summaryHtml;
    },

    render: function render() {
        this.$el.find(".cudl-viewer-metadata-content .cudl-metadata")
            .empty().append(this.renderTemplate());
    },

    onMetadataAvailable: function onMetadataAvailable() {
        this.metadata = this.viewerModel.getMetadata();
        this.render();
    }
});

var CudlPageTitleView = extend(function CudlPageTitleView(options) {
    CudlPageTitleView.super.call(this, options);

    this.viewerModel = options.viewerModel;

    $(this.viewerModel)
        .on("change:metadata", $.proxy(this.render, this));
}, View);
$.extend(CudlPageTitleView.prototype, {
    render: function render() {
        var metadata = this.viewerModel.getMetadata();
        var itemTitle = metadata.getTitle();

        this.$el.text(this.getPageTitle(itemTitle));
    },

    getPageTitle: function getPageTitle(itemTitle) {
        return itemTitle +
            " - Cambridge University Digital Library Embedded Viewer";
    }
});

var CudlShortcutsView = extend(function CudlShortcutsView(options) {
    CudlShortcutsView.super.call(this, options);

    $(document).on("click", options.triggerer,
        $.proxy(this.onToggleEvent, this));
}, View);
$.extend(CudlShortcutsView.prototype, {

    onToggleEvent: function onToggleEvent(e) {
        this.toggleShortcutVisibility();
        return false;
    },

    toggleShortcutVisibility: function toggleShortcutVisibility() {
        this.$el.slideToggle();
    }
});

function CudlService(options) {
    options = $.extend({}, CudlService.DEFAULT_OPTIONS, options);
    this.metadataUrlPrefix = options.metadataUrlPrefix;
    this.metadataUrlSuffix = options.metadataUrlSuffix;
    this.dziUrlPrefix = options.dziUrlPrefix;

    this.urlManipulator = document.createElement("a");
    this.urlManipulator.href = options.metadataUrlHost;
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
    getJsonMetadata: function getJsonMetadata(id, jqxhrOut) {
        jqxhrOut = jqxhrOut || [];
        var url = this.getMetadataUrl(id);

        var startMillis = now();

        var jqxhr = $.ajax({
            url: url,
            dataType: "json"
        });
        jqxhrOut.push(jqxhr);
        return jqxhr.then(
            function(data, textStatus, xhr) {
                ga("send", "timing", "Metadata", "Downloaded",
                    now() - startMillis, url);

                return data;
            },
            function(xhr, textStatus, errorThrown) {
                return {
                    xhr: xhr,
                    textStatus: textStatus,
                    errorThrown: errorThrown
                };
            }
        );
    },

    getMetadata: function getMetadata(id, jqxhrOut) {
        return this.getJsonMetadata(id, jqxhrOut)
            .then($.proxy(this.metadataFromJson, this, id));
    },

    metadataFromJson: function metadataFromJson(id, json) {
        return new CudlMetadata(id, json);
    },

    getAbsoluteUrl: function getAbsoluteUrl(pathAndSearch) {
        var url = $("<a>").prop("href", pathAndSearch)[0];
        this.urlManipulator.pathname = url.pathname;
        this.urlManipulator.search = url.search;
        return this.urlManipulator.href;
    }
});

function CudlMetadata(id, json) {
    this.id = id;
    this.json = json;
    this.descriptionMetadataIndex =
        this.indexDescriptionMetadata(this.json);
}
$.extend(CudlMetadata.prototype, {
    indexDescriptionMetadata: function indexDescriptionMetadata(json) {
        var index = {};
        var descs = json.descriptiveMetadata;
        for(var i in descs) {
            index[descs[i].ID] = descs[i];
        }
        return index;
    },

    getId: function getId() {
        return this.id;
    },

    isEmbeddable: function() {
        return this.json.embeddable !== false;
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

    getCreationDate: function getCreationDate() {
        var desc = this.getPrimaryDescription();
        return (desc.creations &&
            desc.creations.value &&
            desc.creations.value[0] &&
            desc.creations.value[0].dateDisplay &&
            desc.creations.value[0].dateDisplay.displayForm);
    },

    getPublicationDate: function getPublicationDate() {
        var desc = this.getPrimaryDescription();
        return (desc.publications &&
            desc.publications.value &&
            desc.publications.value[0] &&
            desc.publications.value[0].dateDisplay &&
            desc.publications.value[0].dateDisplay.displayForm);
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
    },

    getImageCopyrightStatement: function getImageCopyrightStatement() {
        return this.getPrimaryDescription().displayImageRights || "";
    }
});

function CudlViewerModel(options) {
    options = $.extend({}, CudlViewerModel.DEFAULT_OPTIONS, options);

    // Register listeners before events are triggered by this constructor
    if(options.listeners) {
        registerListeners(this, options.listeners);
    }

    this.cudlService = options.cudlService;
    this.metadata = null;
    this.imageNumber = options.imageNumber;

    this.metadataJqxhr = null;
    this.tilesourceJqxhr = null;

    this.loadingCount = 0;

    this.setItemId(options.itemId);
}
CudlViewerModel.DEFAULT_OPTIONS = {
    cudlService: new CudlService(),
    metadata: null,
    imageNumber: 1
};
$.extend(CudlViewerModel.prototype, {

    setItemId: function setItemId(id) {
        if($.type(id) !== "string") {
            throw new Error("id must be a string, got: " + id);
        }
        if(this.itemId === id) {
            return;
        }

        this.itemId = id;
        this._loadMetadata();
        $(this).trigger("change:itemId");
    },

    getItemId: function getItemId() {
        return this.itemId;
    },

    _loadMetadata: function _loadMetadata() {
        this.bumpLoadingCount(1);
        var self = this;
        var jqxhr = this.metadataJqxhr;
        if(jqxhr !== null) {
            jqxhr.abort();
            console.assert(this.metadataJqxhr === null);
        }

        // Obtain a reference to the jqxhr backing the metadata promise so
        // that we can abort it if required.
        var jqxhrOut = [];
        var futureMetadata = this.cudlService
            .getMetadata(this.itemId, jqxhrOut);

        futureMetadata.done(
            $.proxy(this.onMetadataAvailable, this, this.itemId));

        futureMetadata.fail(
            $.proxy(this.onMetadataLoadFailed, this, this.itemId));

        this.metadataJqxhr = jqxhr = jqxhrOut[0];
        jqxhr.always(function() {
            self.metadataJqxhr = null;
            self.bumpLoadingCount(-1);
        });

    },

    onMetadataLoadFailed: function onMetadataLoadFailed(itemId, details) {
        if(details.textStatus === "abort") {
            return;
        }

        var body, bodyHtml, title;
        var status = details.xhr.status;
        if(status == 403) {
            reportUnembeddableItem(this);
            return;
        }
        else if(status == 404) {
            title = "Item not found";
            bodyHtml = "The item “<code>" + escapeAsHtml(itemId) +
            "</code>” does not exist";
        }
        else if(Math.floor(status / 100) === 4) {
            body = "There may be a problem with the embed code";
        }
        reportError({title: title, bodyHtml: bodyHtml, body: body});
    },

    bumpLoadingCount: function bumpLoadingCount(amount) {
        var oldCount = this.loadingCount;

        if(oldCount + amount < 0) {
            throw new Error("negative loading count");
        }

        this.loadingCount = oldCount + amount;
        if((!oldCount && this.loadingCount) ||
            (oldCount && !this.loadingCount)) {
            $(this).trigger("change:loading");
        }
    },

    isLoading: function isLoading() {
        return !!this.loadingCount;
    },

    onMetadataAvailable: function onMetadataAvailable(itemId, metadata) {
        // Check that we've received the metadata corresponding to the
        // current itemId
        if(itemId !== this.itemId) {
            return;
        }

        // Some items are not allowed to be embedded
        if(!metadata.isEmbeddable()) {
            reportUnembeddableItem(this, metadata);
            return; // Don't set metadata
        }

        this.metadata = metadata;

        // Ensure the page number is within bounds
        var imageNumber = this.imageNumber;
        if(!this.isValidImageNumber(imageNumber)) {
            // Default the image number if it was invalid
            imageNumber = 1;
        }

        $(this).trigger("change:metadata", metadata);
        // Set the number to trigger the change event
        this.setImageNumber(imageNumber, true);
    },

    getTilesource: function getTilesource(imageNumber) {
        this.bumpLoadingCount(1);
        var self = this;
        var jqxhr = this.tilesourceJqxhr;
        if(jqxhr !== null) {
            jqxhr.abort();
        }

        var page = this.getMetadata().getPages()[imageNumber - 1];

        // Temporary hack to add in the DZI format to metadata until we
        // are able to switch to IIIF
        if (!page.displayImageURL) {
            page.displayImageURL = "content/images/"+page.IIIFImageURL+".dzi";
        }

        var url = this.getCudlService().getDziUrl(page.displayImageURL);

        var startMillis = now();

        this.tilesourceJqxhr = jqxhr = $.ajax({
            url: url,
            dataType: "xml"
        });

        jqxhr.always(function() {
            self.tilesourceJqxhr = null;
            self.bumpLoadingCount(-1);
        });

        return jqxhr.then(function(data) {
            ga("send", "timing", "Dzi", "Downloaded",
                now() - startMillis, url);

            var dzi = new OpenSeadragon.DziTileSource();
            if(!dzi.supports(data)) {
                // Reject the returned promise
                return $.Deferred()
                    .reject("Unable to interpret data as a a DZI", data);
            }
            return dzi.configure(data, url);
        }, function(jqxhr, textStatus, errorThrown) {
            if(textStatus !== "abort") {
                reportError();
            }
        });
    },

    getImageNumber: function getImageNumber() {
        return this.imageNumber;
    },

    isValidImageNumber: function isValidImageNumber(number) {
        return number >= 1 && number <= this.getImageCount();
    },

    setImageNumber: function setImageNumber(image, forceTrigger) {
        // If we don't have any metadata set then we can set any image
        // number, it'll be validated after the metadata is loaded
        if(this.getMetadata() === null) {
            this.imageNumber = Math.max(1, image);
            // No need to trigger yet, it'll be done when the metadata is
            // loaded.
            return;
        }

        if(!this.isValidImageNumber(image)) {
            throw new RangeError("image out of range: " + image);
        }

        var changed = image !== this.imageNumber;
        this.imageNumber = image;

        if(changed || forceTrigger) {
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
    },

    getItemCudlUrl: function getItemCudlUrl() {
        return "http://cudl.lib.cam.ac.uk/view/" +
            encodeURIComponent(this.itemId);
    }

});


var KeyboardShortcutHandler = extend(function KeyboardShortcutHandler(
    options) {
    KeyboardShortcutHandler.super.call(this, options);

    this.actions = options.actions;
    this.charCodeIndex = this.buildCharCodeIndex(this.actions);

    this.$el.on("keypress", $.proxy(this.onKeypress, this));
}, View);
KeyboardShortcutHandler.DEFAULT_OPTIONS = {
    actions: {}
};
$.extend(KeyboardShortcutHandler.prototype, {
    buildCharCodeIndex: function buildCharCodeIndex(actions) {
        var index = {};
        for(var key in actions) {
            if(key.length !== 1) {
                throw new Error("Invalid key binding: " + key);
            }
            index[key.charCodeAt(0)] = actions[key];
        }
        return index;
    },

    onKeypress: function onKeypress(e) {
        var charCode = e.charCode;
        if(!(charCode in this.charCodeIndex)) {
            return;
        }

        // Alert others that a shortcut has occurred
        $(this).trigger("shortcut", {
            charCode: charCode,
            character: String.fromCharCode(charCode),
            action: this.charCodeIndex[charCode]
        });
        this.charCodeIndex[charCode].trigger(e);
    }
});


function Action(options) {}
$.extend(Action.prototype, {
    trigger: function() { throw new Error("Not implemented"); },

    getLabel: function getLabel() {
        return this.label;
    },

    label: "Action"
});

var OSDAction = extend(function OSDAction(options) {
    OSDAction.super.call(this, options);

    if (!options.viewer) {
        throw new Error("No viewer provided");
    }

    this.viewer = options.viewer;
}, Action);
$.extend(OSDAction.prototype, {
    getViewer: function getViewer() {
        return this.viewer;
    },

    getViewport: function getViewport() {
        return this.getViewer().viewport;
    },

    hasViewport: function hasViewport() {
        return !!this.getViewport();
    }
});


/**
 * An Action which pans an OpenSeadragon Viewer when triggered.
 *
 * @param options
 * @constructor
 */
var OSDPanAction = extend(function OSDPanAction(options) {
    options = $.extend({}, OSDPanAction.DEFAULT_OPTIONS, options);

    OSDPanAction.super.call(this, options);

    this.directionName = options.direction;
    this.panDistance = options.distance;
    this.directionVector = options.directionVector ||
        this.directionVectorFromDirection(
            this.directionName, this.panDistance);

    this.label = "pan " + (this.directionName ||
            "by " + this.directionVector);
}, OSDAction);
OSDPanAction.DEFAULT_OPTIONS = {
    direction: "right",
    distance: 1/10,
    directionVector: null
};
$.extend(OSDPanAction.prototype, {
    directionVectorFromDirection: function directionVectorFromDirection(
        directionName, panDistance) {
        var x, y;
        if(directionName === "left") { x = -1; y = 0; }
        else if(directionName === "right") { x = 1; y = 0; }
        else if(directionName === "up") { x = 0; y = -1; }
        else if(directionName === "down") { x = 0; y = 1; }
        else { throw new Error("Unknown direction: " + directionName); }

        return new OpenSeadragon.Point(x, y).times(panDistance);
    },

    getDirectionVector: function getDirectionVector() {
        return this.directionVector;
    },

    getPanDelta: function getPanDelta() {
        var zoom = this.getViewport().getZoom();
        return this.getDirectionVector().divide(zoom);
    },

    trigger: function trigger() {
        if(!this.hasViewport()) {
            return;
        }

        this.getViewport().panBy(this.getPanDelta()).applyConstraints();
    }
});

var OSDZoomAction = extend(function OSDZoomAction(options) {
    options = $.extend({}, OSDZoomAction.DEFAULT_OPTIONS, options);

    OSDZoomAction.super.call(this, options);

    this.delta = options.delta || this.calculateDelta(
        options.direction, options.amount);

    this.label = "zoom " + (options.direction || "by " + this.amount);

}, OSDAction);
OSDZoomAction.DEFAULT_OPTIONS = {
    delta: null,
    direction: "in",
    amount: 0.2
};
$.extend(OSDZoomAction.prototype, {
    calculateDelta: function calculateDelta(direction, amount) {
        var delta = Math.abs(amount);

        if (direction === "out") {
            delta *= -1;
        }
        else if (direction !== "in") {
            throw new Error("Unknown direction: " + direction);
        }

        return 1 + delta;
    },

    getDelta: function getDelta() {
        return this.delta;
    },

    trigger: function trigger() {
        if (!this.hasViewport()) {
            return;
        }
        this.getViewport().zoomBy(this.getDelta()).applyConstraints();
    }
});

var OSDRotateAction = extend(function OSDRotateAction(options) {
    options = $.extend({}, OSDRotateAction.DEFAULT_OPTIONS, options);

    OSDRotateAction.super.call(this, options);

    this.delta = options.delta || this.calculateDelta(
        options.direction, options.amount);

    this.label = "rotate " +
        (this.delta < 0 ? "left" : "right") +
        " by " + Math.abs(this.delta) + "°";

}, OSDAction);
OSDRotateAction.DEFAULT_OPTIONS = {
    delta: null,
    direction: "clockwise",
    amount: 90
};
$.extend(OSDRotateAction.prototype, {
    calculateDelta: function calculateDelta(direction, amount) {
        var delta = Math.abs(amount);

        if (direction === "anticlockwise") {
            delta *= -1;
        }
        else if (direction !== "clockwise") {
            throw new Error("Unknown direction: " + direction);
        }

        return delta;
    },

    getDelta: function getDelta() {
        return this.delta;
    },

    trigger: function trigger() {
        if (!this.hasViewport()) {
            return;
        }
        var viewport = this.getViewport();
        viewport.setRotation(
            viewport.getRotation() + this.getDelta());
    }
});

var ButtonPressAction = extend(function ButtonPressAction(options) {
    options = $.extend({}, ButtonPressAction.DEFAULT_OPTIONS, options);
    ButtonPressAction.super.call(this, options);

    this.button = $(options.button);
    if(this.button.length === 0) {
        console.warning(
            "No button elements will be pressed by this action.");
    }

    this.label = "click button: " + options.button;
}, Action);
ButtonPressAction.DEFAULT_OPTIONS = {};
$.extend(ButtonPressAction.prototype, {
    trigger: function trigger() {
        $(this.button).trigger("click", {fromShortcut: true});
    }
});

function reportError(options) {
    options = options || {};
    var error = new CudlErrorView(options);
    $(".errors").append(error.el);
}

function reportUnembeddableItem(viewerModel, metadata) {

    var template = $("#cudl-error-no-embed-template").text();
    var bodyHtml = $($.parseHTML(template));
    var itemName = viewerModel.getItemId();
    if(metadata) {
        itemName = metadata.getTitle();
    }
    bodyHtml.find("em").text("“" + itemName + "”");
    bodyHtml.find("a").attr("href", viewerModel.getItemCudlUrl());
    bodyHtml.find("a").attr("title", itemName);

    reportError({
        title: "Item cannot be embedded",
        bodyHtml: bodyHtml
    });
}

function getItemId() {
    return parseUriQuery(window.location.hash).item ||
        "PR-01890-00011-00067"; // The book of bosh!
}

function getPage() {
    return parseInt(parseUriQuery(window.location.hash).page, 10) || 1;
}

/**
 * Checks the page's hash to see if the sidebar is hidden by default.
 * @returns {boolean} true if the sidebar should be hidden
 */
function isRequestedMetadataVisibilityHidden() {
    return parseUriQuery(window.location.hash)["hide-info"] === "true";
}

function setMetadataVisibilityFromHash(metadataView) {
    metadataView.setVisibility(!isRequestedMetadataVisibilityHidden());
}

/* Show the loading indicator when we're making an requests. Note that
   this doesn't know about openseadragon's image loading. */
function onLoadingChange(e) {
    var cudlViewerModel = this;

    var body = $(document.body);
    var loadingEl = body.children(".loading-indicator");
    var currentlyLoading = body.hasClass("loading");
    var nowLoading = cudlViewerModel.isLoading();

    // Chrome seems to have a bug which causes the balls in the loading
    // animation to not redraw after they're hidden and made visible.
    // The animation is still playing, as the element's size changes in
    // the dev tools, but the element is not redrawn. Detaching and
    // reattaching the element to the DOM forces the animation to restart,
    // but if you do it just before making it visible then Chrome doesn't
    // always run our fade in transition... Detaching it as we hide it
    // does the job.
    if(currentlyLoading && !nowLoading) {
        loadingEl.detach().appendTo(body);
    }

    $(document.body).toggleClass("loading", cudlViewerModel.isLoading());
}

function getPanActions(options) {
    var actions = {};

    for (var key in options.directions) {
        var direction = options.directions[key];
        var actionOptions = $.extend(
            {}, options.options, {direction: direction});
        actions[key] = new OSDPanAction(actionOptions);
    }

    return actions;
}

function AccumulatingEventReporter(options) {
    this.delay = options.delay;

    this.events = {};
    this.timeoutId = null;

    // Always proxy reportEvents to avoid doing it every time we schedule it
    this.reportEvents = $.proxy(this.reportEvents, this);
    // Proxy addEvent for client convenice
    this.addEvent = $.proxy(this.addEvent, this);
}
$.extend(AccumulatingEventReporter.prototype, {
    makeKey: function makeKey(category, action, label) {
        return [category, action, label].join(",");
    },

    addEvent: function addEvent(category, action, label) {
        var key = this.makeKey(category, action, label);
        var val = this.events[key];
        if(val === undefined) {
            val = {
                category: category,
                action: action,
                label: label,
                count: 0
            };
            this.events[key] = val;
        }
        val.count++;
        this.scheduleReport();
    },

    scheduleReport: function scheduleReport() {
        if(this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        this.timeoutId = setTimeout(this.reportEvents, this.delay);
    },

    reportEvents: function reportEvents() {
        for(var i in this.events) {
            var event = this.events[i];

            ga("send", "event", event.category, event.action,
                event.label, event.count);
        }
        this.events = {};
    }
});

// Custom GA dimensions.
// We track the URL of the page which has embedded us if we're in an iframe.
var DIMENSION_EMBEDDING_URL = "dimension1";

function gaTrackEmbeddingURL() {
    var inIframe = parent !== window;
    if(inIframe) {
        // document.referrer is the embedding page on first page load in
        // an iframe.
        ga("set", DIMENSION_EMBEDDING_URL, document.referrer);
        // Could think about using window.location.ancestorOrigins too, but
        // only webkit supports it, and it only gives you domains rather
        // than full URLs.
    }
}

function gaTrackButtonClicks(eventReporter) {
    $(document).on("click", ".cudl-btn", function(e, params) {
        // Don't report button click events which are created from shortcut
        // key actions.
        if(params && params.fromShortcut === true) {
            return;
        }

        var btn = $(e.currentTarget);
        var label = btn.data("ga-label");
        if(!label) {
            var classes = btn.prop("class").split(/\s+/);
            var cudlName = classes.filter(function(x) {
                return /^cudl-btn-.*$/.test(x);
            });
            if(cudlName.length) {
                label = cudlName[0];
            }
        }

        if(!label) {
            console.warn("No GA label available for:", e.target);

        }
        else {
            eventReporter("Buttons", "Clicked", label);
        }
    });
}

function gaTrackShortcuts(keyboardShortcutHandler, eventReporter) {
    $(keyboardShortcutHandler).on("shortcut", function(_, params) {
        var char = params.character;
        var action = params.action;

        var label = char + ": " + action.getLabel();
        eventReporter("Shortcuts", "Used", label);
    });
}

function gaTrackImageNumberInput() {
    $(document).on("change", ".cudl-img-number", function(e) {
        ga("send", "event", "Form Fields", "Changed", "cudl-img-number");
    });
}

function gaTrackShortcutsHelp(eventReporter) {
    $(document).on("click", ".cudl-toggle-shortcuts", function() {
        // Not strictly a button, but meh.
        eventReporter("Buttons", "Clicked", "cudl-toggle-shortcuts");
    });
}

function gaTrackLinkClicks() {
    $(document).on("click", "a", function(e) {
        var label;
        var a = $(e.currentTarget);
        var category;

        // Internal links to image numbers
        if(a.is(".cudl-image-link")) {
            var match = /store.loadPage\((\d+)\)/.exec(a.prop("onclick"));
            label =  (match && match[1]) ||
                a.prop("onclick");
            ga("send", "event", "Image Links", "Clicked", label);
        }
        // External links
        else {
            label = a.prop("href") + " " + (a.prop("title") || a.text());

            // Check if the link is in the metadata, or the general UI
            if(a.is(".cudl-viewer-metadata a")) {
                category = "Metadata Links";
            }
            else {
                category = "UI Links";
            }

            ga("send", "event", category, "Clicked", label);
        }
    });
}

function gaTrackMetadataChange(cudlViewerModel) {
    $(cudlViewerModel).on("change:metadata", function() {
        var metadata = cudlViewerModel.getMetadata();
        var location = window.location +
            "/" + encodeURIComponent(metadata.getId());
        ga("set", {
            page: location
        });
        ga("send", "pageview");
    });
}

function gaTrackImageChange(cudlViewerModel) {
    $(cudlViewerModel).on("change:imageNumber", function() {
        var metadata = cudlViewerModel.getMetadata();
        var imageNumber = cudlViewerModel.getImageNumber();

        var location = window.location +
            "/" + encodeURIComponent(metadata.getId()) +
            "/" + encodeURIComponent(imageNumber);
        ga("set", {
            page: location
        });
        ga("send", "pageview");
    });
}

function gaTrackGlobalErrors() {
    var prev = window.onerror;
    window.onerror = function(message, url, lineNum, columnNum, error) {
        var msg = url + ":" + lineNum + ":" + columnNum + " - " + message;

        ga("send", "exception", {
            exDescription: msg,
            // Must be seeing as we're the global exception handler
            exFatal: true
        });

        // Call the previously set handler, if any
        if($.isFunction(prev)) {
            return prev.apply(this, arguments);
        }
        else {
            return false;
        }
    };
}

function gaTrackAjaxErrors() {
    $(document).ajaxError(
        function(event, jqxhr, ajaxSettings, thrownError) {

        var url = $("a").attr("href", ajaxSettings.url).prop("href");
        var label = ajaxSettings.type + " " + url + " " + jqxhr.status +
            " " + thrownError;
        ga("send", "event", "Ajax Requests", "Failed", label);
    });
}

function gaTrackErrorDialog() {
    $(document).on("cudl:dialog:opened cudl:dialog:closed",
        function(e, params) {

        var action = e.type === "cudl:dialog:opened" ? "Opened" : "Closed";
        var dialog = params.dialog;
        var label = dialog.title;
        ga("send", "event", "Error Dialogs", action, label);
    });
}

function initFromConfig(config) {

    if(config.googleAnalyticsTrackingId) {
        ga("create", config.googleAnalyticsTrackingId, "auto");
    }
    gaTrackEmbeddingURL();
    ga("send", "pageview");

    gaTrackGlobalErrors();
    var delayedEventReporter = new AccumulatingEventReporter(
        {delay: 5000}).addEvent;
    gaTrackButtonClicks(delayedEventReporter);
    gaTrackImageNumberInput();
    gaTrackShortcutsHelp(delayedEventReporter);
    gaTrackLinkClicks();
    gaTrackAjaxErrors();
    gaTrackErrorDialog();


    var cudlService = new CudlService({
        metadataUrlPrefix: config.metadataUrlPrefix,
        metadataUrlSuffix: config.metadataUrlSuffix,
        dziUrlPrefix: config.dziUrlPrefix,
        metadataUrlHost: config.metadataUrlHost
    });

    var cudlViewerModel = new CudlViewerModel({
        itemId: getItemId(),
        cudlService: cudlService,
        imageNumber: getPage(),
        listeners: {
            "change:loading": onLoadingChange
        }
    });
    gaTrackMetadataChange(cudlViewerModel);
    gaTrackImageChange(cudlViewerModel);

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

    var fullscreenView = new CudlFullscreenView({
        el: $(".cudl-btn-fullscreen")[0]
    });

    var pageTitleView = new CudlPageTitleView({
        el: $("head title")[0],
        viewerModel: cudlViewerModel
    });

    var shortcutsView = new CudlShortcutsView({
        el: $(".cudl-shortcut-definitions")[0],
        triggerer: ".cudl-toggle-shortcuts"
    });

    // Keyboard shortcuts
    var viewer = viewerView.getViewer();
    var keyboardShortcutHandler = new KeyboardShortcutHandler({
        el: document.body,
        actions: $.extend(
            {
                "q": new OSDZoomAction({
                    direction: "out",
                    amount: 0.2,
                    viewer: viewer
                }),
                "e": new OSDZoomAction({
                    direction: "in",
                    amount: 0.2,
                    viewer: viewer
                }),

                "z": new OSDRotateAction({
                    direction: "anticlockwise",
                    amount: 360 / 4,
                    viewer: viewer
                }),
                "x": new OSDRotateAction({
                    direction: "clockwise",
                    amount: 360 / 4,
                    viewer: viewer
                }),

                // Rotate small amounts with shift held
                "Z": new OSDRotateAction({
                    direction: "anticlockwise",
                    amount: 360 / 36,
                    viewer: viewer
                }),
                "X": new OSDRotateAction({
                    direction: "clockwise",
                    amount: 360 / 36,
                    viewer: viewer
                }),

                "r": new ButtonPressAction({
                    button: ".cudl-metadata-toggle-btn"
                }),
                "f": new ButtonPressAction({
                    button: ".cudl-btn-fullscreen"
                }),

                "c": new ButtonPressAction({button: ".cudl-btn-img-prev"}),
                "v": new ButtonPressAction({button: ".cudl-btn-img-next"})
            },
            getPanActions({
                directions: {
                    "w": "up",
                    "a": "left",
                    "s": "down",
                    "d": "right"
                },
                options: {
                    // Distance each pan moves the viewport by
                    // (relative to the zoom level).
                    distance: 1 / 10,
                    viewer: viewer
                }
            })
        )
    });
    gaTrackShortcuts(keyboardShortcutHandler, delayedEventReporter);

    // Update the item/page when the hash changes
    $(window).on("hashchange", function () {
        cudlViewerModel.setItemId(getItemId());
        cudlViewerModel.setImageNumber(getPage());

        setMetadataVisibilityFromHash(metadataView);
    });
    // Catch the initial visibility value in the hash
    setMetadataVisibilityFromHash(metadataView);

    // implement the global store.loadPage() method which is used by the
    // metadata's anchor tags (via onclick attrs) to load pages.
    window.store = {
        loadPage: function loadPage(number) {
            console.log("loading page via store.loadPage(", number, ")");
            cudlViewerModel.setImageNumber(number);
            return false;
        }
    };
}

export { initFromConfig };
