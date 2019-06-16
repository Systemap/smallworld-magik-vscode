// ---------------------------------------------------------
//   siamz.smallworld-magik
// ---------------------------------------------------------
'use strict';
const vscode = require('vscode');
const { spawn,exec } = require('child_process');
const fs = require("fs");
const os = require("os");
const workbenchConfig = vscode.workspace.getConfiguration('Smallworld');

const swgis = {
    swWorkspace: {index: [], symbs: [], paths: [], refes:[]},
    activeSession: {swTerminal:null, swAgent:null, aliasStanza:null, aliasPath:null, gisPath:null, cbAgent:null},
    gisPath: [],
    codeAction: [], 
    sessions: null, 
    terminal: null,
    cbDocument: null,
    aliasStanza: null, 
    errorHover:null, 
    aliasePattern: /[A-Za-z_0-9-]:$/i,
    setActiveSession: function(swTerminal, swAgent, aliasStanza, aliasPath, gisPath) {
        swgis.sessions = swAgent; 
        swgis.terminal = swTerminal; 
        swgis.aliasStanza = aliasStanza;
        // var swPath = workbenchConfig.get('SMALLWORLD_GIS');
        // if (gisPath) {  
        //     swPath = gisPath.replace("/bin/x86/gis.exe","");
        // }
        var aSession = swgis.activeSession 
        aSession.swTerminal = swTerminal; 
        aSession.swAgent = swAgent; 
        aSession.aliasPath = aliasPath;
        aSession.aliasStanza = aliasStanza;
        aSession.gisPath = gisPath; 
        aSession.cbAgent = null;
    },
    endActiveSession: function(){
        swgis.sessions = null; 
        swgis.terminal = null; 
        swgis.aliasStanza = null;
        var aSession = swgis.activeSession 
        aSession.gisPath = null; 
        aSession.swTerminal = null; 
        aSession.swAgent = null; 
        aSession.cbAgent = null;
        aSession.aliasPath = null;
        aSession.aliasStanza = null;
        },
    getActiveSession: function(){
        var cp = swgis.terminal;
        if(!cp) return;
        else return cp;

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
        this.check_gisPath();
    }
    
    check_gisPath(){
        const swgis = this.swgis;
        swgis.gisPath = [];
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
                }
                catch(err) {
                    gisPath = null;
                }        
            }
            if (gisPath)  swgis.gisPath.push(gisPath);
        }    
        return swgis.gisPath.length > 0 ;       
    }

    check_startup(gisPath, cp){
		swgis.activeSession['SMALLWORLD_GIS'] = gisPath.split("/bin/x86")[0];
		var swgisHome = swgis.activeSession['SMALLWORLD_GIS'];
        if (swgisHome) 
        try {      
            swgisHome = swgisHome.replace(/\//g,"\\");
            cp.sendText("SET SMALLWORLD_GIS="+swgisHome+"\n%SMALLWORLD_GIS%\\config\\environment.bat")
        }
        catch(err) { }

        var startup = workbenchConfig.get('startup');
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

    runaliases(aliasStanza, aliasPath,gisPath){
        // ---------------------------------------------------------
        // https://github.com/MarkerDave
        const swgis = this.swgis;
        if (swgis.getActiveSession()) return;
        try
        {
            if (!aliasStanza) {
                var args = swgis.codeAction.command.arguments
                aliasStanza = args[0];
                aliasPath = args[1];
                gisPath = args[3];
            };
              aliasPath = aliasPath.replace(/\//g,'\\');
            //Start Smallworld with the selected alias
           var execCommand = gisPath;
           try {      
                var envbatCmd =  aliasPath.replace("gis_aliases","environment.bat")
                fs.statSync(envbatCmd);
                execCommand += ' -e ' + "\"" + envbatCmd + "\"";
            }
            catch(err) { }
                execCommand += ' -a ' + "\"" + aliasPath + "\""+ ' ' + aliasStanza;

            //Show some messages.
            var sessionInfo = "Smallworld GIS Starting...\n" + execCommand;
            execCommand = this.check_gisExec(execCommand);
            console.log(execCommand);

           const cp = vscode.window.createTerminal(aliasStanza);
            const sw = this;

            vscode.window.onDidOpenTerminal( function(event) { 
                if (event.name === aliasStanza) {
                    swgis.setActiveSession(cp, sw, aliasStanza, aliasPath, gisPath)
                    cp.show(workbenchConfig.get("preserveFocus"));
                    vscode.commands.executeCommand("workbench.action.terminal.clear");
                }
            });
            vscode.window.onDidCloseTerminal( function(terminal) { 
                if (terminal === swgis.terminal) 
                    swgis.endActiveSession()
            });

            this.check_startup(gisPath, cp);
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
            { vscode.window.showInformationMessage(err.message); }
   
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
            
        }
         catch(err)
        {
            swgis.endActiveSession();
            vscode.window.showInformationMessage(err.message);  
        }
    }

    packageCode(codeBlock,fileName){
        const swgis = this.swgis;

        if (fileName) {
            fileName = fileName.split('\\');
            fileName = fileName[fileName.length-1];
        } else{
            fileName = "vscode-" + swgis.aliasStanza + ".magik";
        }
        var tmp = os.tmpdir()+"/"+fileName;
        for(var n=10; n<100;++n){
            try {
                fs.writeFileSync(tmp+n,codeBlock);
                return "load_file(\""+tmp+n+"\")";
            }
            catch(err) {
                if(n>9) 
                    return "\"VSCode: failed to package Magik code "+tmp+n+"\"";
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
                codeBlock = this.packageCode(codeBlock,fileName)    
        }

        swgis.terminal.sendText(codeBlock);
    }

	// ---------------------------------------------------------
}
exports.swSessions = swSessions;
