
# RSS Team 12

## Set up the website

### Set your team name and number within the website

We do not expect you to know how to build a website or use HTML/CSS. However, editing the given files to you should be quick and easy.

Read through the **index.html** file to see how the website is structured. Wherever you encounter `[Insert Team Name here]` or `[Insert Team # here]`, do just that.

The team name is up to you to decide!

### Create your About page

If you look at the files given to you, you will discover the **about.md** file: ```assets/posts/about.md```. This file is used for the About page.

The current About page is an example from a previous year's team. Replace the members' information with your own team's information, and don't forget to include pictures! Pictures can theoretically be stored anywhere, but it's good practice to organize your files neatly. Pictures for the About page are currently in ```assets/pictures/about/```.

*Note: It is encouraged to do this without using any HTML!*

### Link to your GitHub

In the **index.html** file, find the line that reads:

```<a href="https://github.mit.edu/" target="_blank">GitHub</a>```

Fill in the URL to your team's organization so that the website will link to your GitHub and, subsequently, labs.

### Remove the Setup button

In the **index.html** file, find the line that reads:

```<li><a href="#instructions">Setup</a></li>```

Comment it out using:

```<!-- <li><a href="#instructions">Setup</a></li> -->``` 

## Notes for the future

### Creating lab reports

You will see that there is a template for a lab report titled **lab3.md**. As you can see, the post is written using Markdown. If you've never used Markdown before, you can find a cheatsheet here: 

[https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet#code](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet#code).

Also, LaTex is supported! Many of the reports will require you to display equations: delineate LaTex equations by wrapping them with $$ (e.g. $$\frac{1}{2}$$) and they will be converted to LaTex when the website loads.

*Note: This will work best when the LaTex equations are on their own lines.*

There are [plenty](https://stackedit.io/app) [of](https://dillinger.io/) [tools](http://jbt.github.io/markdown-editor/) to work in Markdown. For future labs, create your lab reports using markdown, and save them as **lab[#].md** within the **posts** folder, and the HTML will automatically be created for your website.

Feel free to use plenty of pictures, gifs, and videos in your lab reports! No one likes reading blocks and blocks of text.

### Linking the lab presentations

In the **index.html** file, there are links to lab presentations that are unfinished. As you create lab presentations, make sure to link to them on your website.

### Video

Eventually, you will create a final video for the class. This is what the video button will eventually link to.

If you'd like, you can link to a YouTube channel where you can post multiple videos of the car! We only expect to have the final video linked. 	

### A note on pictures

Make sure that the pictures you use are relatively lightweight. It's not uncommon to use PNG for most images on websites so that they load faster.