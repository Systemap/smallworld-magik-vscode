// ---------------------------------------------------------
//   siamz.smallworld-magik
// ---------------------------------------------------------
'use strict';
const vscode = require('vscode');
const { exec } = require('child_process');
const fs = require("fs");
const workbenchConfig = vscode.workspace.getConfiguration('Smallworld');
const swgis = {
    gisPath: null,
    codeAction: [], 
    sessions: null, 
    errorHover:null, 
    aliasePattern: /[A-Za-z_0-9-]:$/i};


class swSessions{
    constructor() {
        this.swgis = swgis;
        this.check_gisPath();
    }
    
    check_gisPath(){
        var gisPath = workbenchConfig.get('gisPath');
        if (gisPath) {
            var stat;
            try {
                stat = fs.statSync(gisPath);
            }
            catch(err) {
                gisPath = null;
            }        
        }
        if (swgis.gisPath==gisPath) return false;
        swgis.gisPath = gisPath;
        return true;       
    }
	// ---------------------------------------------------------
   	// https://github.com/MarkerDave
    runaliases(selectedAlias, currentOpenTabFilePath){

        try
        {
            if (!selectedAlias) {
                var args = swgis.codeAction.command.arguments
                selectedAlias = args[0];
                currentOpenTabFilePath = args[1];
            };
           
            //Start Smallworld with the correct alias
           var execCommand = swgis.gisPath +  ' -a ' + "\"" + currentOpenTabFilePath + "\""+ ' ' + selectedAlias;

            //Show some messages.
            var sessionInfo = 'Smallworld GIS Starting...' + selectedAlias + "\n" + execCommand;
           vscode.window.showInformationMessage(sessionInfo);

           let cp = exec(execCommand, (err, stdout, stderr) => { 
                if (err)
                   return console.error(err);
                else 
                   console.log(stdout);
            });
            swgis.sessions = cp;

        }
         catch(err)
        {
            vscode.window.showInformationMessage(err.message);  
        }
    }
	// ---------------------------------------------------------
}
exports.swSessions = swSessions    
