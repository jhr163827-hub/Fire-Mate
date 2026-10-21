// index.html with its local ./js/*.js files inlined, for tests that check the app's source text.
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
module.exports=()=>fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script src="\.\/(js\/[\w-]+\.js)\?v=[\d.]+"><\/script>/g,(_,file)=>'<script>'+fs.readFileSync(path.join(root,file),'utf8')+'</script>');
