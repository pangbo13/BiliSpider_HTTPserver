bilispider_host = location.href.split("#")[1];
if(!bilispider_host) bilispider_host = location.hostname + ":1214"
$(document).ready(function(){
	$("#set-url").on("click",function(){
		location.assign("#"+$("#url-input").val());
		location.reload();
	})
})