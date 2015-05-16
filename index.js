
var path = require('path');
var Cluc = require('cluc');
var Transport = Cluc.transports.process;

var projectPath = process.cwd();
var pkg = require(path.join(projectPath, 'package.json') );
var gitAuth = require(path.join(projectPath, 'github.json') );
var docConfig = require(path.join(projectPath, '.doc.json') );

var revision = pkg.version;
var releaseType;
var tmpPath;
var ghPagesBranch = docConfig.ghPages || 'gh-pages';
var sshUrl = pkg.repository.url.replace(/https?:\/\//,'ssh://git@');

//region Git auth and github release
function sendGhAuth(context){
  context.answer(/^Username/i, gitAuth.username);
  context.answer(/^Password/i, gitAuth.password);
}
//endregion


var line = new Cluc()

  .ensureFileContains('.gitignore', '\n.idea/\n')
  .ensureFileContains('.gitignore', '\ngithub.json\n')

  .readFile('./version', function(next, content){
    content = _s.trim(content);
    this.saveValue('releaseType', content.match(/^([^\s]+)/)[1]);
    this.saveValue('revision', content.match(/\s+([^\s]+)$/)[1]);
    next();

  }).then(function(next){
    if(!pkg.name){
      throw 'pkg.name is missing';
    }
    if(!pkg.repository){
      throw 'pkg.repository is missing';
    }
    this.saveValue('pkgName', pkg.name);
    this.saveValue('pkgRepository', pkg.repository);
    this.saveValue('sshUrl', sshUrl);
    this.saveValue('jsdox', docConfig.jsdox);
    this.saveValue('jsdoc', docConfig.jsdoc);
    this.saveValue('mocha', docConfig.mocha);
    this.saveValue('ghBranch', ghPagesBranch);
    next();

  }).title('', 'Generating documentation \n' +
  'on <%=ghBranch%> for <%=releaseType%> <%=revision%>')

  .mktemp(pkg.name, function(err, tmpDir){
    this.display();
    this.dieOnError();
    tmpPath = tmpDir;
    this.saveValue('tmpPath', tmpPath);

  }).stream('cd <%=tmpPath%>', function(){
    this.display();

    /**
     *  Repository preparation
     */
  }).stream('git clone <%=sshUrl%>', function(){
    this.warn(/fatal:/);
    this.display();
  }).stream('git checkout <%=ghBranch%>', function(){
    this.warn(/fatal:/);
    this.display();
  }).stream('git checkout -b <%=ghBranch%>', function(){
    this.warn(/fatal:/);
    this.display();
  }).stream('ls -alh', function(){
    this.warn(/fatal:/);
    this.display();

  }).stream('git status', function(){
    this.warn(/fatal:/);
    this.success(/(est propre|is clean)/i, 'Everything up-to-date');
    this.display();

    /**
     *  README
     */
  }).putFile('<%=projectPath%>/README.md', '.', function(){
    this.warn(/fatal:/);
    this.success(/(est propre|is clean)/i, 'Everything up-to-date');
    this.display();

    /**
     *  JsDox
     */
  }).skip(!docConfig.jsdox).each(docConfig.jsdox, function(to, from){
    line.stream('jsdox -r --output <%=tmpPath%>'+to+' <%=projectPath%>'+from, function(){
      this.spinUntil(/.+/);
      this.success('completed');
      this.display();
    });

    /**
     *  JsDoc
     */
  }).skip(!docConfig.jsdoc).each(docConfig.jsdoc, function(to, from){
    line.stream('jsdoc -r <%=projectPath%>'+from+' <%=tmpPath%>'+to, function(){
      this.spinUntil(/.+/);
      this.success('completed');
      this.display();
    });

    /**
     *  MOCHA
     */
  }).stream('cd <%=projectPath%>', function(){
  }).skip(!docConfig.mocha).stream('mocha --reporter markdown > <%=tmpPath%>/mocha-toc.md', function(){
    this.spinUntil(/.+/);
    this.success('completed');
    this.display();
  }).stream('cd <%=tmpPath%>', function(){

    /**
     *  Git commit and push
     */
  }).stream('git add -A', function(){
    this.display();
    sendGhAuth(this);

  }).stream('git commit -am "Generate documentation for <%=releaseType%> <%=newRevision%>"', function(){
    this.success(/\[([\w-]+)\s+([\w-]+)]/i,
      'branch\t\t%s\nnew revision\t%s');
    this.success(/([0-9]+)\s+file[^0-9]+?([0-9]+)?[^0-9]+?([0-9]+)?/i,
      'changed\t%s\nnew\t\t%s\ndeleted\t%s');
    this.warn(/(est propre|is clean)/i, 'Nothing to do');
    sendGhAuth(this);
    this.display();

  }).stream('git push <%=sshUrl%>', function(){
    this.warn(/fatal:/);
    this.success(/(est propre|is clean)/i, 'Everything up-to-date');
    this.display();

  }).stream('git status', function(){
    this.warn(/fatal:/);
    this.success(/(est propre|is clean)/i, 'Everything up-to-date');
    this.display();

    /**
     *  Clean up
     */
  }).stream('cd <%=projectPath%>', function(){
    this.display();
  }).rmdir('<%=tmpPath%>', function(){

  }).run(new Transport());
