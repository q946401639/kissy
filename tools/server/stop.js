/**
 * stop kissy server
 * @author yiminghe@gmail.com
 */

var fs = require('fs');
var cwd = process.cwd();
var pid = fs.readFileSync(cwd + '/pid.log', {
    encoding: 'utf-8'
});
process.kill(pid, 'SIGINT');



//com child_process = require('child_process');
//var S = require('../../lib/seed');
//child_process.exec('ps aux | grep node', function (error, stdout, stderr) {
//    var lines = stdout.split(/\n/);
//    lines.forEach(function (l) {
//        if (S.endsWith(l, 'server/start')) {
//            var id = l.split(/\s+/)[1];
//            child_process.exec('kill ' + id);
//        }
//    });
// restart
//        child_process.spawn('nohup', ['npm', 'start'], {
//            //detached: true,
//            stdio: [ 'ignore', process.stdout, process.stderr ]
//        }).unref();
//});