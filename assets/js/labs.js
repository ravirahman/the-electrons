function run(post, target) {
    var converter = new showdown.Converter();

    var oRequest = new XMLHttpRequest(),
        sURL = post,
        target = document.getElementById(target),
        allText = "";

    oRequest.open("GET",sURL,false);
    oRequest.setRequestHeader("Accept", "text/html");
    oRequest.onreadystatechange = function () {
        if (oRequest.readyState == 4) {
            if (oRequest.status == 200) {
                allText = oRequest.responseText;
                html = converter.makeHtml(allText);
                target.innerHTML = html;
            }
        }
    }
    oRequest.send(null);
}

run("assets/posts/about.md", "about")
run("assets/posts/lab3.md", "lab3")
run("assets/posts/lab4.md", "lab4")
run("assets/posts/lab5.md", "lab5")
run("assets/posts/lab6.md", "lab6")
run("assets/posts/final.md", "final")


