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
    swWorkspaceSymbols: {index: [], cache: [], paths: []},
    gisPath: [],
    codeAction: [], 
    sessions: null, 
    aliasStanza: null, 
    errorHover:null, 
    aliasePattern: /[A-Za-z_0-9-]:$/i,
    activeSession: function(){
        var cp = swgis.sessions;
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
};


class swSessions{
    constructor() {
        this.swgis = swgis;
        this.check_gisPath();
    }
    
    check_gisPath(){
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

    check_environmentPaths(cp){
        var swgisHome = workbenchConfig.get('SMALLWORLD_GIS');
        if (!swgisHome || swgisHome == "") {  
            swgisHome = workbenchConfig.get('gisPath');
            if (swgisHome && swgisHome != "") 
                swgisHome = swgisHome.replace("/bin/x86/gis.exe","");
        }
        if (swgisHome) 
        try {      
            swgisHome = swgisHome.replace(/\//g,"\\");
            cp.sendText("SET SMALLWORLD_GIS="+swgisHome);
        }
        catch(err) { }

        var javaHome = workbenchConfig.get('JAVA_HOME');
        if (javaHome && javaHome != "") 
            try {      
                if (javaHome) {
                    fs.statSync(javaHome);
                    cp.sendText("SET JAVA_HOME="+javaHome);
                }
            }
            catch(err) { }

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
        
        if (swgis.activeSession()) return;
        try
        {
            if (!aliasStanza) {
                var args = swgis.codeAction.command.arguments
                aliasStanza = args[0];
                aliasPath = args[1];
                gisPath = args[3];
            };
           
              aliasPath = aliasPath.replace(/\//g,'\\');
         //Start Smallworld with the correct alias
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

            vscode.window.onDidOpenTerminal( function(event) { 
                if (event.name === aliasStanza) {
                    swgis.sessions = cp;
                    swgis.aliasStanza = aliasStanza;
                    cp.show(workbenchConfig.get("preserveFocus"));
                    vscode.commands.executeCommand("workbench.action.terminal.clear");
                }
            });
            vscode.window.onDidCloseTerminal( function(terminal) { 
                if (terminal === swgis.sessions)  {
                    swgis.sessions = null; 
                    swgis.aliasStanza = null;
                }
            });

            this.check_environmentPaths(cp);
            cp.sendText(execCommand);

            try {            
                vscode.window.onDidChangeActiveTerminal(function(terminal) { 
                    if (terminal != swgis.sessions) return ;  
                        console.log("onDidChangeActiveTerminal "+terminal);
                    if (!terminal.processId) swgis.sessions = null;
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
            vscode.window.showInformationMessage(err.message);  
        }
    }

	// ---------------------------------------------------------
}
exports.swSessions = swSessions    
