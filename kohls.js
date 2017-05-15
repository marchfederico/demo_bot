/// Setup the Cisco Spark Websocket

var SparkWebSocket = require('ciscospark-websocket-events')
var request = require('request')
var accessToken = process.env.SPARK_TOKEN
var Promise = require('Bluebird')
var PORT = process.env.PORT || 3000

var webHookUrl =  "http://localhost:"+PORT+"/ciscospark/receive"

sparkwebsocket = new SparkWebSocket(accessToken)
sparkwebsocket.connect(function(err,res){
   if (!err) {
         if(webHookUrl)
             sparkwebsocket.setWebHookURL(webHookUrl)
   }
   else {
        console.log("Error starting up websocket: "+err)
   }
})

//////// Bot Kit //////

var Botkit = require('botkit');

var controller = Botkit.sparkbot({
    debug: true,
    log: true,
    public_address: "https://localhost",
    ciscospark_access_token: process.env.SPARK_TOKEN
});


var bot = controller.spawn({
});

controller.setupWebserver(PORT, function(err, webserver) {

 //setup incoming webhook handler
  webserver.post('/ciscospark/receive', function(req, res) {
            res.sendStatus(200)
            controller.handleWebhookPayload(req, res, bot);
  });

});



controller.hears(['.*search for (.*)', '.*tell me more about (.*)'], 'direct_message,direct_mention', function(bot, message) {
    if (message.match)
      keyword = encodeURIComponent(message.match[1])
    searchURL ="https://www.kohls.com/typeahead/"+keyword+".jsp?preview=true&callback=typeaheadProductPreview"
    console.dir(message.match)
    request.get(searchURL, function(response,error,body){
      console.log(body)
      regexJSON = /[\S\s]*\(([\S\s]*)\)[\S\s]*/
      results = body.match(regexJSON)
      results  = JSON.parse(results[1])
      if(results)
      {
        bot.reply(message, {markdown:"**_Here's what I found:_** <br>"})
        console.dir(results.productItems,null,2)
          Promise.map(results.productItems, function(product){
            return new Promise(function (resolve, reject) {
            request.get("https://www.kohls.com"+product.productURL, function(error,response,body){
              regexProduct = /[\S\s]*<script type="text\/javascript">[\S\s]*productJsonData =(.*);.*<\/script>/
						var productJsonData = body.match(regexProduct)
          //  console.log("\n"+productJsonData[1]+"\n\n")
          var productJsonData2
          var content

          if (!productJsonData)
          {
            content = "<br> No summary available.<br>"
          }
          else {
            productJsonData2 = JSON.parse(productJsonData[1])
            content = productJsonData2.productItem.accordions.productDetails.content.replace("\n\r", "<br>");
            productdetail = content.indexOf("<p>PRODUCT DETAIL")
            if (productdetail > 0)
                content = content.substring(0,productdetail)
          }


              console.log("----------------------")
              console.log(content)
              console.log(("----------------------"))
              var productUrl = product.productURL.substring(0,product.productURL.length - 8);
              bot.reply(message, {markdown:"**["+product.displayName+"](https://www.kohls.com"+productUrl+")**<br>"+content+"<hr>",files:[product.imageURL]}, function(error,mes){
                if (!error)
                {
                  console.log("Posted message")
                  resolve(mes)
                }
                else {
                    console.log("Error!!!")
                  reject(error)
                }
              })


        })

           })
         },{concurrency:1})
          .then(function(products){

          })



      }
      else {
        bot.reply(message, "Sorry couldn't find the item you were looking for");
      }

    })



});

controller.hears(['.*CNET says? about (.*)'], 'direct_message,direct_mention', function(bot, message) {

      bot.reply(message, {markdown:"**Here's the review from CNET:**"});
   var file = "https://cisco.box.com/shared/static/83bvo3e3j9lvym0a4t79942wosu9l86w.png"
   var content ="**The Good** / The **Ninja DUO** blender performs as well as models that cost twice as much.<br><br>"

   content +="**The Bad** / The **Ninja DUO** looks bulky and you may not like having to keep track of the various accessories.<br><br>"

   content +="**The Bottom Line**  / If you're looking for a blender that can replace a lot of your small appliances without breaking the bank, you can't go wrong with the reasonably priced **Ninja DUO**."

  bot.reply(message, {markdown:content,files:[file]});
})
controller.hears(['.*help me.*'], 'direct_message,direct_mention', function(bot, message) {

  bot.reply(message, {markdown:"Sure we can help you!<br>[Click here to call Customer Support](ciscospark://call?sip=sip:jewitikk@cisco.call.ciscospark.com)"});
})
