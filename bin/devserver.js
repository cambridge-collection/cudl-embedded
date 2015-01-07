#!/usr/bin/env node

var PORT = 1234;

var INDEX_HTML = [
    "<!doctype html>",
    "<html>",
    "<head>",
    "<title>index - cudl-embedded devserver</title>",
    "</head>",
    "<h1>Links</h1>",
    "<ul>",
    "<li><a href='/examples/blog/blog.html'>Blog example</a></li>",
    "<li><a href='/embed/v0/viewer'>Embeddable Viewer</a></li>",
    "</ul>"
].join("\n");

var express = require("express");
var app = express();
app.set("views", __dirname + "/../src/html-templates");
app.set("view engine", "jade");

app.use("/embed/v0/", express.static(__dirname + "/../src"));
app.use("/examples/", express.static(__dirname + "/../examples"));

app.get("/embed/v0/viewer", function(req, res){
    res.render("player");
});

app.get("/", function(req, res) {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.end(INDEX_HTML, "UTF-8");
});

app.listen(PORT);
console.log("Listening on port: " + PORT);
