// ---------------------------------------------------------
//   siamz.smallworld-magik
// ---------------------------------------------------------
'use strict';
const vscode = require('vscode');
const { exec } = require('child_process');
const workbenchConfig = vscode.workspace.getConfiguration('Smallworld');
const swgis = {codeAction: [], sessions: null};

class swSessions{
    constructor() {
        this.swgis = swgis;
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
                //Get gis.exe path
            var gisPath = workbenchConfig.get('gisPath');
            console.log("path: " + gisPath);

           
            //Start Smallworld with the correct alias
           var execCommand = gisPath +  ' -a ' + "\"" + currentOpenTabFilePath + "\""+ ' ' + selectedAlias;

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
