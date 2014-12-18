$(function() {
    var config = null;
    try {
        config = JSON.parse($("#config").text());
    }
    catch(e) {
        throw new Error("Unable to load viewer config: " + e);
    }

    if(config !== null) {
        window.CudlViewer.initFromConfig(config);
    }
});
