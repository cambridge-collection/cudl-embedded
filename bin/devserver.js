var express = require("express");
var app = express();
app.set("views", __dirname + "/../src/html-templates");
app.set("view engine", "jade");

app.use("/embed/v0/", express.static(__dirname + "/../src"));

app.get("/embed/v0/viewer", function(req, res){
    res.render("player");
});

app.listen(1234);
