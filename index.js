#!/usr/bin/env node

var path = require('path');
var _ = require('underscore');
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

    _.defaults(
      machine.profileData.doc,{
        jsdoc:{paths:[]},
        jsdox:{paths:[]},
        yuidoc:{paths:[]},
        apidoc:{paths:[]},
        docco:{paths:[]}
      });

    var docConfig = machine.profileData.doc;

    var line = new Cluc();
    line
    /**
     *  Prepare local environment
     */
      .ensureFileContains('.gitignore', '\n.local.json\n')
      .ensureFileContains('.gitignore', '\n.idea/\n')
    /**
     *  Read local environment
     */
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
        this.saveValue('ghBranch', docConfig.ghBranch);
        this.saveValue('jsdox', docConfig.jsdox);
        this.saveValue('jsdoc', docConfig.jsdoc);
        this.saveValue('yuidoc', docConfig.yuidoc);
        this.saveValue('docco', docConfig.docco);
        this.saveValue('apidoc', docConfig.apidoc);
        this.saveValue('mocha', docConfig.mocha);
        next();
      })
      .title('', '\nGenerating documentation for <%=releaseType%> <%=revision%>\n')
    /**
     *  Temp directory setup
     */
      .when(!docConfig.outPath, function(line){
        line.subtitle('', 'Setting up temp directory')
          .mktemp(pkg.name, function(err, tmpDir){
            this.display();
            this.dieOnError();
            this.saveValue('tmpPath', tmpDir);
          })
      })
      .when(docConfig.outPath, function(line){
        line.subtitle('', 'Setting up out directory')
          .ensureEmptyDir(docConfig.outPath, function(err){
            this.display();
            this.dieOnError();
            this.saveValue('tmpPath', path.resolve(docConfig.outPath));
          })
      })
      .stream('cd <%=tmpPath%>', function(){
        this.display();
      })
    /**
     *  Repository preparation
     */
      .when(docConfig.ghBranch, function(line){
        line.subtitle('', 'Setting up git repository')
          .subtitle('', 'on <%=ghBranch%>')
          .stream('git clone <%=sshUrl%> .', function(){
            this.warn(/fatal:/);
            this.display();
          }).stream('git checkout <%=ghBranch%>', function(){
            this.warn(/fatal:/);
            this.display();
          }).stream('git checkout -b <%=ghBranch%>', function(){
            this.warn(/fatal:/);
            this.display();
          })
      })
    /**
     *  README
     */
      .putFile('<%=projectPath%>/README.md', '<%=tmpPath%>/README.md', function(){
        this.warn(/fatal:/);
        this.success(/(est propre|is clean)/i, 'Everything up-to-date');
        this.display();

      })
    /**
     *  JsDox
     */
      .when(docConfig.jsdox.paths, function(line){
        line.subtitle('', 'Running jsdox')
          .each(docConfig.jsdox.paths, function(from, to){
            line.ensureEmptyDir('<%=tmpPath%>/'+to);
          })
          .each(docConfig.jsdox.paths, function(from, to){
            line.stream('jsdox -r --output <%=tmpPath%>/'+to+' <%=projectPath%>/'+from, function(){
              this.spinUntil(/.+/);
              this.success('completed');
              this.display();
            });

          })
      })
    /**
     *  JsDoc
     */
      .when(docConfig.jsdoc.paths, function(line){
        line.subtitle('', 'Running jsdoc')
          .each(docConfig.jsdoc.paths, function(from, to){
            line.ensureEmptyDir('<%=tmpPath%>/'+to);
          }).each(docConfig.jsdoc.paths, function(from, to){
            line.stream('jsdoc -r <%=projectPath%>/'+from+' -d <%=tmpPath%>/'+to, function(){
              this.spinUntil(/.+/);
              this.success('completed');
              this.display();
            });

          })
      })
    /**
     *  YuiDoc
     */
      .when(docConfig.yuidoc.paths, function(line){
        line.subtitle('', 'Running yuidoc')
          .each(docConfig.yuidoc.paths, function(from, to){
            line.ensureEmptyDir('<%=tmpPath%>/'+to);
          }).each(docConfig.yuidoc.paths, function(from, to){
            var cmd = 'yuidoc ';
            cmd += '-o <%=tmpPath%>/'+to+' ';
            cmd += '-c <%=projectPath%>/package.json ';
            if(docConfig.yuidoc.selleck){
              cmd += '--selleck ';
            }
            if(docConfig.yuidoc.lint){
              cmd += '--lint ';
            }
            if(docConfig.yuidoc.themedir){
              cmd += '-t "'+docConfig.yuidoc.themedir+'" ';
            }
            if(docConfig.yuidoc.exclude){
              cmd += '-x "'+docConfig.yuidoc.exclude.join(',')+'" ';
            }
            if(docConfig.yuidoc.theme){
              cmd += '-T "'+docConfig.yuidoc.theme+'" ';
            }
            if(docConfig.yuidoc.syntaxtype){
              cmd += '--syntaxtype "'+docConfig.yuidoc.syntaxtype+'" ';
            }
            if(docConfig.yuidoc.helpers){
              docConfig.yuidoc.helpers.push(path.joint(__dirname, 'yuidoc-include-helper.js'));
              cmd += '--helpers '+docConfig.yuidoc.helpers.join(',');
            }
            cmd += '<%=projectPath%>/'+from+' ';
            line.stream(cmd, function(){
              this.spinUntil(/.+/);
              this.success('completed');
              this.display();
            });

          })
      })
    /**
     *  docco
     */
      .when(docConfig.docco.paths, function(line){
        line.subtitle('', 'Running docco')
          .each(docConfig.docco.paths, function(from, to){
            line.ensureEmptyDir('<%=tmpPath%>/'+to);
          }).each(docConfig.docco.paths, function(from, to){
            var cmd = 'docco ';
            cmd += '-o <%=tmpPath%>/'+to+' ';
            if(docConfig.docco.layout){
              cmd += '-l "'+docConfig.docco.layout+'" ';
            }
            if(docConfig.docco.template){
              cmd += '-t "'+docConfig.docco.template+'" ';
            }
            if(docConfig.docco.extension){
              cmd += '-e "'+docConfig.docco.extension+'" ';
            }
            if(docConfig.docco.languages){
              cmd += '-l "'+docConfig.docco.languages+'" ';
            }
            if(docConfig.docco.marked){
              cmd += '-m "'+docConfig.docco.marked+'" ';
            }
            cmd += '<%=projectPath%>/'+from+' ';
            line.stream(cmd, function(){
              this.spinUntil(/.+/);
              this.success('completed');
              this.display();
            });
          })
      })
    /**
     *  apidoc
     */
      .when(docConfig.apidoc, function(line){
        line.subtitle('', 'Running apidoc')
          .each(docConfig.apidoc.paths, function(from, to){
            line.ensureEmptyDir('<%=tmpPath%>/'+to);
          })
          .each(docConfig.apidoc.paths, function(from, to){
            var cmd = 'apidoc ';
            if(docConfig.apidoc.filters){
              cmd += '-f "'+docConfig.apidoc.filters+'" ';
            }
            if(docConfig.apidoc.template){
              cmd += '-t "'+docConfig.apidoc.template+'" ';
            }
            cmd += '-o <%=tmpPath%>/'+to+' ';
            cmd += '-i <%=projectPath%>/'+from+' ';
            line.stream(cmd, function(){
              this.spinUntil(/.+/);
              this.success('completed');
              this.display();
            });
          })
      })
    /**
     *  MOCHA
     */
      .when(docConfig.mocha, function(line){
        line.subtitle('', 'Generating mocha TOC')
          .stream('cd <%=projectPath%>')
          .stream('mocha --reporter markdown > <%=tmpPath%>/mocha-toc.md', function(){
            this.spinUntil(/.+/);
            this.success('completed');
            this.display();
          })
      })
    /**
     *  Git commit and push
     */
      .when(docConfig.ghBranch, function(line){
        line.subtitle('', 'Pushing to remote')
          .stream('cd <%=tmpPath%>')
          .stream('git add -A', function(){
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
          })
      })
    /**
     *  Clean up
     */
      .when(!docConfig.outPath, function(line){
        line
          .subtitle('', 'Cleaning up')
          .stream('cd <%=projectPath%>').rmdir('<%=tmpPath%>')
      })
      .subtitle('', 'All done !')
      .run(new Transport());

  });

//endregion


//region Git auth and github release
function sendGhAuth(context){
  var gitAuth = context.getValue('gitAuth');
  context.answer(/^Username/i, gitAuth.username);
  context.answer(/^Password/i, gitAuth.password);
}
//endregion
