// ---------------------------------------------------------
//   siamz.smallworld-magik
// ---------------------------------------------------------
'use strict';
const vscode = require('vscode');
const fs = require("fs");
const os = require("os");
const workbenchConfig = vscode.workspace.getConfiguration('Smallworld');

const swgis = {
    swWorkspace: {tagIndex: {}, symbs: [], paths: [], refIndex:{} },
    activeSession: {swTerminal:null, swAgent:null, gisCommand:null, aliasFile:null, gisPath:null, cbAgent:null},
    gisPath: [],
    gisCommand: [],
    codeAction: [], 
    sessions: null, 
    terminal: null,
    cbDocument: null,
    cbData: [],
    cbInfo: [],
    errorHover:null, 
	aliasePattern: /[a-z_0-9-]:$/i,
	binx86Pattern: /[\/\\]bin[\/\\]x86/i,
	filterWorkspaceSymbs: function (filter){
   
        var className, methodName, packageName;
        var cm = filter.split(':');
        if (cm.length>1){
            packageName = cm[0];
            filter = cm[1];
        }
        var n = filter.indexOf('.');
        cm = filter.split('.');
        if (n==0) {
            methodName = cm[0];
            filter = cm[0];
        } else if (n==filter.length) {
            className = cm[0];
            filter = cm[0];
        } else if (n>0) {
            className = cm[0];
            methodName = cm[1];
            filter = cm[1];
        }   

		filter = new RegExp(filter,'i')
		var tagIndex = swgis.swWorkspace.tagIndex;
		var fullmatch = [];
		var partmatch = [];
		for (var fname in tagIndex) {
			var symbols = tagIndex[fname];
			for (var i in symbols){
				var symbol = symbols[i];
				if(!symbol.name) {
					// ignore
					console.log("--- filterWorkspaceSymbs... null symbol.name: "+fname);
					console.log(symbol);
				} else if (symbol.name.search(filter)!=0) {
					continue;
				} else if (methodName && methodName == symbol.name)  {
					if (className && className != symbol.containerName)
						partmatch.push( symbol );
					else 	
						fullmatch.push( symbol );
				} else if (className && className ==  symbol.name)  {
						fullmatch.push( symbol );
				} else {
					    partmatch.push( symbol );
				}
			}
		};
		if (fullmatch.length >0) 
			return  fullmatch;
		else 
			return  partmatch;
	},	
    setActiveSession: function(swTerminal, swAgent, gisCommand, aliasFile, gisPath) {
        swgis.sessions = swAgent; 
        swgis.terminal = swTerminal; 
        // var swPath = workbenchConfig.get('SMALLWORLD_GIS');
        // if (gisPath) {  
        //     swPath = gisPath.replace("/bin/x86/gis.exe","");
        // }
        var aSession = swgis.activeSession 
        aSession.swTerminal = swTerminal; 
        aSession.swAgent = swAgent; 
        aSession.aliasFile = aliasFile;
        aSession.gisCommand = gisCommand;
        aSession.gisPath = gisPath; 
        aSession.cbAgent = null;
        aSession.cbSocket = null;
    },
    endActiveSession: function(){
        swgis.sessions = null; 
        swgis.terminal = null; 
        var aSession = swgis.activeSession 
        aSession.gisPath = null; 
        aSession.swTerminal = null; 
        aSession.swAgent = null; 
        aSession.cbAgent = null;
        aSession.cbSocket = null;
        aSession.aliasFile = null;
        aSession.gisCommand = null;
        },
    getActiveSession: function(param){
        var cp = swgis.terminal;
        if(!cp) return;
        param = (param)? param : 'swTerminal';
		const aSession = swgis.activeSession;
		switch (param){
			case 'cbSocket':
				cp = aSession.cbSocket;
				if (cp) return cp;
				aSession.cbAgent = null;
			case 'cbAgent':
				cp = aSession.cbAgent;
				if (!cp || cp.stdin.destroyed)
					return aSession.cbAgent = null;
			default:
				cp = aSession[param];		
		} 
		return cp;

        const pId = os.tmpdir()+"\\"+ Math.trunc(Math.random()*1e5) +".tmp"; 
        try {      
            var res= cp.sendText("external_text_output_stream.new(\""+pId+"\").close()");
            //fs.statSync(javaHome);
            const util = require('util');
            const setTimeoutPromise = util.promisify(setTimeout);
            setTimeoutPromise(5000).then((cp) => {
                if (!fs.existsSync(pId))
                    swgis.sessions = null;
            });
            return swgis.sessions;     
        }
        catch(err) { }
    }   
}
exports.swgis = swgis;  

class swSessions{
    constructor() {
        this.swgis = swgis;
    }
    run(){
        this.check_gisPath();
        var gisCommand = workbenchConfig.get('gisCommand');
        var gisPath = workbenchConfig.get('gisPath');
        var startup = workbenchConfig.get('startup');
        if(!gisCommand || !gisCommand.length) {
                vscode.window.showInformationMessage("Press F2-z (SW RUN GIS Command) to start a session. Save GIS Commands in Preferences - Settings - Smallworld GIS");
            if (!gisPath || !gisPath.length)
                vscode.window.showInformationMessage("Configure Smallworld.gisPath in Preferences - Settings - Smallworld GIS, to specify the path of gis.exe");
        } else if (!startup || !gisPath.length) {
                vscode.window.showInformationMessage("Configure Smallworld.startup in Preferences - Settings - Smallworld GIS, to run batch commands and set environment variables before starting gis.exe.");
        } else {
            var listSessions = "List GIS Commands (F2-z)...";
            var lastSession = workbenchConfig.get('recallSession');
            const startSession = function (selection) {
                if ( selection == listSessions ){
                    vscode.commands.executeCommand('swSessions.gisCommand');
                } else if (selection) {
                    vscode.commands.executeCommand('swSessions.gisCommand',lastSession);
                }
            }    
            if (lastSession)
                vscode.window.showInformationMessage("Start a GIS Session:",lastSession.session,listSessions).then(startSession);
            else     
                vscode.window.showInformationMessage("Start a GIS Session:",listSessions).then(startSession);

        }
    }
    check_gisPath(){
        const swgis = this.swgis;
        swgis.gisPath = [];
        var errorMsg;
        var swgisPath = workbenchConfig.get('gisPath');
        for (var i=0; i<swgisPath.length ; i++) {
            let gisPath = swgisPath[i];
            if (gisPath.length==1) {
                gisPath = swgisPath;
                i= gisPath.length;
            }
            if (gisPath) {
                try {
				  var stat = fs.statSync(gisPath);
				  gisPath = gisPath.split(swgis.binx86Pattern)[0].replace(/\//g,'\\');
                } catch(err) {
                    errorMsg = (errorMsg)? errorMsg+", \n"+ gisPath : err.message 
                    gisPath = null;
                }        
            }
            if (gisPath)  swgis.gisPath.push(gisPath);
        }    
        if (errorMsg) 
            vscode.window.showErrorMessage("Smallworld.gisPath Error: \n"+errorMsg);  
            return swgis.gisPath.length > 0 ;       
    }

    check_startup(gisPath, cp, startup){
        const swgis = this.swgis;
		swgis.activeSession['SMALLWORLD_GIS'] = gisPath.split(swgis.binx86Pattern)[0];
		var swgisHome = swgis.activeSession['SMALLWORLD_GIS'];
        if (swgisHome) 
        try {      
            swgisHome = swgisHome.replace(/\//g,"\\");
            cp.sendText("SET SMALLWORLD_GIS="+swgisHome+"\n%SMALLWORLD_GIS%\\config\\environment.bat")
        }
        catch(err) { }

        startup = (startup)? startup : workbenchConfig.get('startup');
        startup = (typeof startup == 'string')? [startup] : startup;
        for (var i in startup)
            // try 
            {      
                var cmd = startup[i].replace(/\//g,"\\");
                if (cmd) {
                    cp.sendText(cmd);
                }
            }
            // catch(err) { }

    }

    check_gisExec(execCommand,cp){
		const swgis = this.swgis;
        var eCmd = execCommand.split(/gis.exe/i);
        var swDir = eCmd[0].trim();
        var lunchers = ["runalias.exe"];// ,"sw_magik_win32.exe"]
        for (var i in lunchers) {
            let luncher = lunchers[i];
            try {
                fs.statSync(swDir + luncher);
                return execCommand.replace(/gis.exe/i,luncher);
            }
            catch(err) { }
        }    
        return execCommand;       
    }

    runaliases(aliasStanza, aliasFile,gisPath){
        // ---------------------------------------------------------
        // https://github.com/MarkerDave
        const swgis = this.swgis;
        if (swgis.getActiveSession()) return;
        try  {
            if (!aliasStanza) {
                var args = swgis.codeAction.command.arguments
                aliasStanza = args[0];
                aliasFile = args[1];
                gisPath = args[3];
            };
              aliasFile = aliasFile.replace(/\//g,'\\');
            //Start Smallworld with the selected alias
           var execCommand = gisPath;
            execCommand += ' -a ' + "\"" + aliasFile + "\""+ ' ' + aliasStanza;
			this.gisCommand(execCommand,aliasStanza);

        } catch(err) {
            swgis.endActiveSession();
            vscode.window.showErrorMessage(err.message);  
        }

    }

    clearWorkspaceCache(cacheId){
		const swWorkspace = this.swgis.swWorkspace;
		for(var id in swWorkspace) {
			if(!cacheId || cacheId==id)
				swWorkspace[id] = [];
		}
        vscode.window.showInformationMessage("SW Workspace Cache (Definitions, Symbols and References) has been cleared.");
    }

    dumpWorkspaceCache(fileName){

        if (!fileName) {
            fileName = os.tmpdir()+"\\swWorkspace.tsv";
        }
        
        const swWorkspace = this.swgis.swWorkspace;
        let data = "#swWorkspace:"+fileName+'\n';
		var i = 0;
        for(var fname in swWorkspace['tagIndex']) {
			var tags = swWorkspace['tagIndex'][fname];
			++i;
            for(var n in tags){
                data += i+':'+n;
                for(var id in tags[n])
                    data += '\t'+id+':'+ tags[n][id];
                data += '\t'+ fname+'\n';
            }
        }
        let key = 'refIndex';
        data += '\n--- '+key+' ---------------\n';
		for(var fname in swWorkspace[key]) {
            for(var id in swWorkspace[key][fname]) {
                data += '\t'+id+':'+swWorkspace[key][fname][id];
            }
            data += '\t'+fname+'\n';
        }

        try {
            fs.writeFileSync(fileName, data);
        }
        catch(err) {
            console.log("\"VSCode: failed to package code "+fileName);
        }
        vscode.window.showInformationMessage("SW Workspace Cache Dumped to:"+fileName);
    }

    gisCommand(execCommand){
        const swgis = this.swgis;
		if (swgis.getActiveSession()) 
			return vscode.window.showInformationMessage("GIS terminal is active: "+swgis.activeSession.session); 


		const ask = async (engine, prompt, format, items, key) => {
            var arg, args = [">Click here to add a new GIS Command, or select one from the list:"];
            for (var i in items) args.push(++i+" "+items[--i][key]);
            if (args.length == 1)
                arg = await vscode.window.showInputBox({ placeHolder:format, prompt:prompt, value:"", ignoreFocusOut: true});
            else 
                arg = await vscode.window.showQuickPick(args, { placeHolder:"GIS Command:", prompt:prompt, ignoreFocusOut: true});
            if (arg == args[0]) {
                arg = await vscode.window.showInputBox({ placeHolder:format, prompt:prompt, value:"", ignoreFocusOut: true});
            }else if (arg) {
                var i = arg.indexOf(" ");
                var n = Number( arg.slice(0,i) )-1;
                arg = items[n];
            }    
			if (arg) 	
				engine.gisCommand(arg);
	}
        const extreme = function (exp){
			let ext = [];
			switch (typeof exp) {
				case 'string': 
					ext = exp.trim();
					break;
				case 'object': 
					ext = {};
				case 'array': 
					for(var e in exp)
    	                if (typeof exp[e]=='string') 
        	                ext[e.toLocaleLowerCase()] = exp[e].trim();
            	        else 
                	        ext[e.toLocaleLowerCase()] = exp[e];
            }  
            return ext;  
		}

        const exslash = function (path){
			if (typeof path=='string') 
				path = path.replace(/\//g,'\\');
			
			return path;
		}

        const expression = function (key){
            if (!key) 
                key = "\\s+";
            else if (key.indexOf("s+")<0)    
                key = "\\s?" + key + "\\s+";
           return new RegExp(key,"i"); 
        }
        const exsplit = function (str,key){
            let keyX = expression(key+"\\s+"); 
            if (str.search(keyX) != 0 )
                keyX = expression(key); 
            if (str.search(keyX) > -1 )
                return str.split(keyX);
        }
    	const exorcise = function (arg){
            arg = arg.trim();
            if (arg.search(/["']/)==0) {
                arg = "\"" + arg.split(/["']/)[0] + "\"";
            } else if (/\s/.test(arg) )	
                arg = arg.split(/\s+/)[0];
           return arg;
        }
		const extract = function (key, execCommand){
            if (execCommand){
                let arg = execCommand[key];
                if (!arg && typeof execCommand == 'string' && execCommand.length){
                    arg = exsplit(execCommand, key);
                    if (arg) {
                        arg = exorcise(arg[1]);
                    }    
                }
                return arg;
            }
        }
		const explode = function (command){
            const exp = {"-p":"<gispath>", "-e":"<envfile>", "-a":"<aliasfile>", "-j":"<joptions>","-o":"<OSGIdir>","-l":"<logfile>"};
            command = extreme(command);
            exp.session = command["session"];
            exp.gispath = command["gispath"];
            exp.command = command["command"];
            exp.startup = command["startup"];
            exp.alias = command["alias"];
            exp.saveconfig = command["saveconfig"];
			command = (command["command"] || typeof command != 'string')? command["command"]:command; 
			if (!command) return exp;
            else if (!exp.command ) exp.command = command;

            const binx86gisexe = /[\/\\]bin[\/\\]x86[\/\\](gis.exe|runalias.exe)/i;
            if (command.search(binx86gisexe)>0) {
                var arr = command.split(binx86gisexe);
                if (!exp.gispath) exp.gispath = arr[0];
                command = arr[2];
				exp.command =  command;
			}
			
			command = command.replace(expression('-q'),"");
			for(var key in exp ) {
				if (key[0]=='-') {
					exp[key] = extract(key,command);
					if (exp[key]){
						command = command.replace(expression(key),'');
						command = command.replace(exp[key],'');
					}	
				}
			}

			if (exp['-p']){
                exp['-p'] = exp['-p'].split(/[\/\\]bin[\/\\]x86/i)[0];
                if (!exp.gispath)
                    exp.gispath = exp['-p'];
            } else if ( exp.gispath) {
				exp['-p'] =  exp.gispath;
			}	
			exp.gispath = exslash( exp.gispath);

			var args = command.trim().split(/\s+/);
			let aliasRegEx =  /[\w_\-!?]+/;
			if (args.length > 0 && aliasRegEx.test(args[0]) ){
				exp.alias = args[0];
			}
			
			command = (exp.command)? exp.command : "";
			['-p','-e','-a'].forEach( (key)=>{
				let val = exp[key];
				if (val) {
					exp[key] = exslash( exp[key]);
					let keyRegEx =  new RegExp ("\\s?"+key+"\\s+"+val+"\\s?","i");	
					if (keyRegEx.test(command))
						command = command.replace(keyRegEx, " "+key+" "+exp[key]+" ");
					else {
						keyRegEx =  new RegExp ("\\s?"+key+"\\s+","i");	
						if (!keyRegEx.test(command))	
						command = key + " " + exp[key] + " " + command;
					}
					command = command.replace(/\s+/g," ")	
				}
			});	
			exp.command = command;
			exp.session = (exp.session)? exp.session :  exp.command;
			return exp;
		}			
		const expand = function (aliasFile){
			let stanzas = [];
			try {      
				fs.statSync(aliasFile);
				var data = fs.readFileSync(aliasFile);
				var codeBlock = data.toString();
				var regEx = /^[\w_\-!?]+:\s*\n/gm; // 
				let match;
				while (match = regEx.exec(codeBlock)) {
					stanzas.push(match[0].replace(/[:\n\s]/g,""));
				}
			}
			catch(err) { }
			return stanzas;
		}
        const exists = function (gisCommand1,gisCommand2) {
			let cmd1 = explode(gisCommand1);
			let cmd2 = explode(gisCommand2);
			return cmd1.command == cmd2.command && cmd1.gispath == cmd2.gispath;
		}
        const extrim = function (title, alias) {
			title = (title)? alias + ":  "+ title : alias
			// let n = title.length;
			// if (n >43) 
			// 	title = "..."+title.substr(n-43);
			return title; 
		}

        let cmd = explode(execCommand);
        try {
			if (cmd['-a'] && !cmd.alias){
				let aliases = expand(cmd['-a']);
				if (aliases.length){
					for(var a in aliases) {
						var subcmd =  explode(cmd);
						subcmd.saveconfig = true;
						subcmd.alias = aliases[a];
						subcmd.command = subcmd.command.replace( cmd['-a'],  cmd['-a']+" "+subcmd.alias);
						subcmd.session = extrim(subcmd.session, subcmd.alias);
						aliases[a]= subcmd;
					}    
					let format = "[-p ProductPath] ... [-e environmentFile] ... -a aliasesFile [alias] ...";
					return ask(this,'GIS command or gis_alias file to start a session:', format,aliases,"session");
				} 
			}			
            if (!cmd.command){
                var commands = [];
                ['gisCommand','sessions'].forEach((setting)=>{
                    let gisCommand = workbenchConfig.get(setting);
                    for (var i in gisCommand) {      
                        cmd = explode(gisCommand[i]);
                        cmd.saveconfig = false;
                        if (cmd['-a'] && !cmd.alias){
                            let aliases = expand(cmd['-a']);
                            if (aliases.length){
                                for(var a in aliases) {
                                    var subcmd =  explode(cmd);
                                    subcmd.saveconfig = true;
                                    subcmd.alias = aliases[a];
                                    subcmd.command = subcmd.command.replace( cmd['-a'],  cmd['-a']+" "+subcmd.alias);
                                    subcmd.session = extrim(subcmd.session, subcmd.alias);
                                    commands.push(subcmd);
                                }    
                            }else {		
                                commands.push(cmd);
                            }
                        } else {
                            commands.push(cmd);
                        }
                    }
                });
                swgis.gisCommand = commands;
                let format = "[-p ProductPath] ... [-e environmentFile] ... -a aliasesFile [alias] ...";
                return ask(this,'GIS command or gis_alias file to start a session:', format,commands,"session");
            } else if (!cmd.gispath) {
                var gisPaths = workbenchConfig.get('gisPath');
                var commands = [];
                if (gisPaths && gisPaths.length){
                    if (typeof gisPaths == 'string') gisPaths = [gisPaths];
                    for(var a in gisPaths) {
                        var subcmd =  explode(cmd);
                        subcmd.saveconfig = true;
                        subcmd.gispath = gisPaths[a].trim().split(swgis.binx86Pattern)[0].trim();
                        if (!subcmd['-p']) subcmd['-p'] = subcmd.gispath;
                        commands.push(subcmd);
                    }    

                } else {
                    commands.push(cmd);
                }
                return ask(this,'Confirm path to Smallworld Core Product.', "%SMALLWORLD_GIS% : ",commands,"gispath");
				
            } else if (cmd.saveconfig == undefined) {
                cmd.saveconfig = true;
				var gisCommand = workbenchConfig.get('gisCommand');
                for (var i in gisCommand) {      
					if (exists(cmd,gisCommand[i])) {
						cmd.saveconfig = false;
						break;	
					}
				}    
            }    

            execCommand =  cmd.command;    
            if(cmd.saveconfig){
                var gisCommand = workbenchConfig.get('gisCommand');
                gisCommand.push(execCommand );
                const saveconfig = {
                    title: 'Save GIS Command in Settings',
                    command() {
                        workbenchConfig.update('gisCommand',gisCommand, vscode.ConfigurationTarget.Global);
                    }
                }
                const saveWorkspace = {
                    title: 'Save in Workspace',
                    command() {
                        workbenchConfig.update('gisCommand',gisCommand, vscode.ConfigurationTarget.Workspace);
                    }
                }
                const saveFolder = {
                    title: 'Save in Folder',
                    command() {
                        workbenchConfig.update('gisCommand',gisCommand, vscode.ConfigurationTarget.WorkspaceFolder);
                    }
                }   
                vscode.window.showInformationMessage(execCommand, saveconfig,saveWorkspace,saveFolder).then(selection => {
                    if (selection) {
                        selection.command();
                    }
                });
            }

			if (cmd['-p'] == cmd.gispath){
				execCommand = execCommand.replace('-p ' +cmd['-p'] , "");
            }

            execCommand =  exslash(cmd.gispath+"\\bin\\x86\\gis.exe ")+ execCommand;    

            workbenchConfig.update('recallSession',cmd, vscode.ConfigurationTarget.Global);

            let aliasStanza = cmd.session;
            let aliasFile =  exslash( cmd['-a']);
			let gisPath =  exslash(cmd.gispath);
			let startup = cmd.startup;
			if (!cmd['-e'] && aliasFile){
                    var i = aliasFile.lastIndexOf("\\");
					var envbatCmd =  aliasFile.slice(0,i)+"\\environment.bat";
					execCommand = execCommand.replace(/\s+-a\s+/i,' -e ' + envbatCmd + " -a ");
            }
            execCommand = this.check_gisExec(execCommand);    
            console.log(execCommand);
            const cp = vscode.window.createTerminal(aliasStanza);
            swgis.setActiveSession(cp, this, cmd);

            vscode.window.onDidOpenTerminal( function(event) { 
                if (event.name === aliasStanza) {
                    cp.show(workbenchConfig.get("preserveFocus"));
                    vscode.commands.executeCommand("workbench.action.terminal.clear");
                }
            });
            vscode.window.onDidCloseTerminal( function(terminal) { 
                if (terminal === swgis.terminal) 
                    swgis.endActiveSession()
            });

            this.check_startup(gisPath, cp, startup);
            cp.sendText(execCommand);

            try {            
                vscode.window.onDidChangeActiveTerminal(function(terminal) { 
                    if (terminal != swgis.terminal) return ;  
                        console.log("onDidChangeActiveTerminal "+terminal);
                    if (!terminal.processId) 
                        swgis.endActiveSession();
                });
            }
            catch(err)
            { vscode.window.showErrorMessage(err.message); }
   
            // //    currentOpenTabFilePath = currentOpenTabFilePath.replace(/\\/g,'/');
            //    let cp = spawn(swgis.gisPath , 
            //         ['-a' , currentOpenTabFilePath , selectedAlias],
            //         {});
            //         // {stdio: ['pipe', 'pipe', 'pipe']});
            //         // {stdio: 'pipe'});
            //    cp.on('close', (code, signal) => {
            //         swgis.sessions = null;
            //         console.log(`child process terminated -------  ${signal}`);
            //     });

            // let cp = exec(execCommand, (err, stdout, stderr) => { 
            //         if (err)
            //         return console.error(err);
            //         else 
            //         console.log(stdout);
            //     }, 
            //     {stdio: 'inherit'}
            // );
            
        } catch(err)  {
            swgis.endActiveSession();
            vscode.window.showErrorMessage(err.message);  
        }
    }

    packageCode(codeBlock,fileName){
        const swgis = this.swgis;

		let tmp;
        if (fileName) {
			tmp = fileName.split('\\');
            tmp = tmp[tmp.length-1];
        } else{
            tmp = "swgis-vscode.magik";
        }
		tmp = os.tmpdir()+"/"+tmp;
		codeBlock = "#vscode:"+fileName+"\n"+codeBlock;
        for(var n=10; n<100;++n){
            try {
                fs.writeFileSync(tmp+n, codeBlock);
                return "$\nload_file(\""+tmp+n+"\",_unset,\""+fileName+"\")";
            }
            catch(err) {
                if(n>99) 
                    return "\"VSCode: failed to package code "+tmp+n+"\"";
            }
        }
    }

    sendCode(codeBlock, mode, fileName){
        let swgis = this.swgis;
        if ( !swgis.terminal ) return;
        if (codeBlock.trim().length==0) return;
        
        // check the context comes from a valid language id
        var codeBlock,range ;
        switch(mode) {
            case 'Error':
                codeBlock =  "\"VSCode: "+codeBlock+"\"";
            case 'Selection','Line':
                break; //send codeBlock as is 
            default:
				if (codeBlock.indexOf("\n")>0)
                	codeBlock = this.packageCode(codeBlock,fileName)    
        }
        swgis.terminal.sendText(codeBlock);
    }

}
exports.swSessions = swSessions;
