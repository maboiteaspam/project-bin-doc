#!/usr/bin/env node

var path = require('path');
var _s = require('underscore.string');
var program = require('commander');
var Config = require("project-bin-config");
var Cluc = require('cluc');
var Transport = Cluc.transports.process;


//region Program

var projectPath = process.cwd();
var pkg = require(path.join(projectPath, 'package.json') );

var releaseType;
var revision = pkg.version;
var tmpPath;
var sshUrl = pkg.repository.url.replace(/https?:\/\//,'ssh://git@');

program
  .version(require(path.join(__dirname, 'package.json') ).version)
  .usage('[env]')
  .description('Generate documentation')
  .arguments('[env]')
  .parse(process.argv);

var env = !program.env?'local':program.env;

(new Config()).load().get(env)
  .forEach(function(machine){

    var line = new Cluc();
    line
      .ensureFileContains('.gitignore', '\n.local.json\n')
      .ensureFileContains('.gitignore', '\n.idea/\n')

      .readFile('./version', function(err, content){
        var rev = '-';
        var type = '-';
        if(!err){
          content = _s.trim(content);
          type = content.match(/^([^\s]+)/)[1];
          rev = content.match(/\s+([^\s]+)$/)[1];
        }else{
          rev = pkg.version;
        }
        this.saveValue('releaseType', type);
        this.saveValue('revision', rev);

      }).then(function(next){
        if(!pkg.name){
          throw 'pkg.name is missing';
        }
        if(!pkg.repository){
          throw 'pkg.repository is missing';
        }
        this.saveValue('pkgName', pkg.name);
        this.saveValue('pkgRepository', pkg.repository);
        this.saveValue('projectPath', projectPath);
        this.saveValue('sshUrl', sshUrl);
        this.saveValue('gitAuth', machine.profileData.github);
        this.saveValue('ghBranch', machine.profileData.doc.ghBranch);
        this.saveValue('jsdox', machine.profileData.doc.jsdox);
        this.saveValue('jsdoc', machine.profileData.doc.jsdoc);
        this.saveValue('mocha', machine.profileData.doc.mocha);
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
      }).stream('git clone <%=sshUrl%> .', function(){
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
      }).skip(!machine.profileData.doc.jsdox)
      .each(machine.profileData.doc.jsdox, function(from, to){
        line.stream('jsdox -r --output <%=tmpPath%>/'+to+' <%=projectPath%>/'+from, function(){
          this.spinUntil(/.+/);
          this.success('completed');
          this.display();
        });

        /**
         *  JsDoc
         */
      }).skip(!machine.profileData.doc.jsdoc)
      .each(machine.profileData.doc.jsdoc, function(from, to){
        line.stream('jsdoc -r <%=projectPath%>/'+from+' <%=tmpPath%>/'+to, function(){
          this.spinUntil(/.+/);
          this.success('completed');
          this.display();
        });

        /**
         *  MOCHA
         */
      }).stream('cd <%=projectPath%>', function(){
      }).skip(!machine.profileData.doc.mocha)
      .stream('mocha --reporter markdown > <%=tmpPath%>/mocha-toc.md', function(){
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

      }).stream('git commit -am "Generate documentation for <%=releaseType%> <%=revision%>"', function(){
        this.success(/\[([\w-]+)\s+([\w-]+)]/i,
          'branch\t\t%s\nnew revision\t%s');
        this.success(/([0-9]+)\s+file[^0-9]+?([0-9]+)?[^0-9]+?([0-9]+)?/i,
          'changed\t%s\nnew\t\t%s\ndeleted\t%s');
        this.warn(/(est propre|is clean)/i, 'Nothing to do');
        sendGhAuth(this);
        this.display();

      }).stream('git -c core.askpass=true push <%=sshUrl%>', function(){
        this.warn(/fatal:/);
        this.success(/(est propre|is clean)/i, 'Everything up-to-date');
        sendGhAuth(this);
        this.display();

      }).stream('git status', function(){
        this.warn(/fatal:/);
        this.success(/(est propre|is clean)/i, 'Everything up-to-date');
        sendGhAuth(this);
        this.display();

        /**
         *  Clean up
         */
      }).stream('cd <%=projectPath%>', function(){
        this.display();
      }).rmdir('<%=tmpPath%>', function(){

      }).run(new Transport());

  });

//endregion


//region Git auth and github release
function sendGhAuth(context){
  var gitAuth = context.getValue('gitAuth');
  context.answer(/^Username/i, gitAuth.username);
  context.answer(/^Password/i, gitAuth.password);
}
//endregion
