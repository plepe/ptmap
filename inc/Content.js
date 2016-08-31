function Content() {
  this.chapters = [];
  this.title = 'unknown';
}

Content.prototype.set_title = function(str) {
  this.title = str;
}

Content.prototype.add_chapter = function(data) {
  var chapter = new ContentChapter(this, data)
  this.chapters.push(chapter);

  return chapter;
}

Content.prototype.update = function() {
  if(this.onupdate)
    this.onupdate();
}

Content.prototype.render = function() {
  this.dom = document.createElement('div');

  this.dom_title = document.createElement('h1');
  this.dom_title.appendChild(document.createTextNode(this.title));
  this.dom.appendChild(this.dom_title);

  this.dom_chapters = document.createElement('div');
  this.dom.appendChild(this.dom_chapters);

  this.chapters = weight_sort(this.chapters);

  for(var i = 0; i < this.chapters.length; i++) {
    var chapter = this.chapters[i];

    chapter.dom = document.createElement('div');
    chapter.dom_title = document.createElement('h2');
    chapter.dom_title.appendChild(document.createTextNode(chapter.title));
    chapter.dom.appendChild(chapter.dom_title);

    try {
      chapter.dom.appendChild(chapter.content);
      chapter.dom_content = chapter.content;
    }
    catch(e) {
      chapter.dom_content = document.createElement('div');
      chapter.dom_content.innerHTML = chapter.content;
    }
    chapter.dom.appendChild(chapter.dom_content);

    this.dom_chapters.appendChild(chapter.dom);
  }

  return this.dom;
}

function ContentChapter(master, param) {
  this.master = master;
  this.title = param.title;
  this.weight = param.weight;
  this.content = param.content;
}

ContentChapter.prototype.set_content = function(content) {
  this.content = content;

  this.dom_content.innerHTML = content;

  this.master.update();
}
