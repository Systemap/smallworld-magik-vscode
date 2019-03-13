// ---------------------------------------------------------
//   siamz.smallworld-magik
// ---------------------------------------------------------
'use strict';
const vscode = require('vscode');
const { spawn,exec } = require('child_process');
const fs = require("fs");
const workbenchConfig = vscode.workspace.getConfiguration('Smallworld');
const swgis = {
    swWorkspaceSymbols: {index: [], cache: [], paths: []},
    gisPath: [],
    codeAction: [], 
    sessions: null, 
    aliasStanza: null, 
    errorHover:null, 
    aliasePattern: /[A-Za-z_0-9-]:$/i};


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

    check_gisExec(execCommand){
        var eCmd = execCommand.split(/gis.exe/i);
        var swDir = eCmd[0].trim();
        var myDir = eCmd[1].split(/gis_aliases/i)[0].split(' -a ')[1].trim();
        try {
            fs.statSync(myDir + "environment.bat");
            execCommand = execCommand.replace(' -a '," -e "+myDir+"environment.bat -a ");
        }
        catch(err) { }

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
        
        if (swgis.sessions) return;
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
           var execCommand = gisPath +  ' -a ' + "\"" + aliasPath + "\""+ ' ' + aliasStanza;

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
 
            cp.sendText(execCommand);

            try {            
                vscode.window.onDidChangeActiveTerminal(function(terminal) { 
                    if (terminal === swgis.sessions)   
                        console.log(t);
                });
            }
            catch(err)
           {
               vscode.window.showInformationMessage(err.message);  
           }
   

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
