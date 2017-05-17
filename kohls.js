/// Setup the Cisco Spark Websocket

var SparkWebSocket = require('ciscospark-websocket-events')
var request = require('request')
var accessToken = process.env.SPARK_TOKEN
var Promise = require('bluebird')
var PORT = process.env.PORT || 3000

var webHookUrl =  "http://localhost:"+PORT+"/ciscospark/receive"
var sipUri = "marfeder@go.webex.com"
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
var blenderList =[ { displayName: 'KitchenAid KSB1575QG 5-Function Diamond Blender',
    imageURL: 'https://media.kohlsimg.com/is/image/kohls/2877786?wid=240&hei=240&op_sharpen=1',
    productURL: '/product/prd-2877786/kitchenaid-ksb1575qg-5-function-diamond-blender.jsp?submit-search=web-ta-product&amp;pfm=search-ta product',
    productId: '2877786',
    content:'This KitchenAid Diamond Vortex five-speed blender is a smooth operator.',
    price:"$99.99" },
  { displayName: 'Vitamix Professional Series 200 Deluxe Blender',
    imageURL: 'https://media.kohlsimg.com/is/image/kohls/2248166?wid=240&hei=240&op_sharpen=1',
    productURL: '/product/prd-2248166/vitamix-professional-series-200-deluxe-blender.jsp?submit-search=web-ta-product&amp;pfm=search-ta product',
    productId: '2248166',
    content: 'Get creative in the kitchen the help of this sleek Vitamix Professional Series blender.',
    price:"$599.99" },
  { displayName: 'Nutri Ninja Blender DUO with Auto-iQ',
      imageURL: 'https://media.kohlsimg.com/is/image/kohls/1974445?wid=240&hei=240&op_sharpen=1',
      productURL: '/product/prd-1974445/nutri-ninja-blender-duo-with-auto-iq-.jsp?submit-search=web-ta-product&amp;pfm=search-ta product',
      productId: '1974445',
      content: 'Get the most out of your healthy lifestyle by blending nutritious recipes in this Nutri Ninja blender.',
      price:"$159.99" } ]



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



controller.hears(['.*search2 for (.*)'], 'direct_message,direct_mention', function(bot, message) {
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
            console.log(JSON.stringify(productJsonData2))
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
controller.hears(['.*search for blender.*'], 'direct_message,direct_mention', function(bot, message) {

bot.reply(message, {markdown:"**_Here's what I found:_** <br>"})
  Promise.map(blenderList, function(product){
    return new Promise(function (resolve, reject) {

           content = product.content +"<br>**Price: "+product.price+"**"



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


 },{concurrency:1})

})


controller.hears(['^help'], 'direct_message,direct_mention', function(bot, message) {

  bot.reply(message, {markdown:"Hi there! You can use me to search for products that are available at Kohls. <br><br>_For example, to search for blenders type:_\n\n>**@Kohls search for blenders**\n\n_And I'll return a list of blenders for you to check out._<br><br>_If you need more info on a paticular blender, just ask me by typing:_\n\n>**@Kohls tell me more about the Ninja DUO blender**<br>\n\n<br>_At anytime if you would like to talk to a customer support representative, just type:_\n\n>**@Kohls can someone help me?**<br> "});
})

controller.hears(['.*tell me more about (.*)'], 'direct_message,direct_mention', function(bot, message) {
  //detailed blender
  html = "<br><p>Get the most out of your healthy lifestyle by blending nutritious recipes in this Nutri Ninja blender.</p></br><p><a target=\"_blank\" href=\"http://content.webcollage.net/kohls/product-content-page?channel-product-id=1974445\"><b>Watch the product video here.</b></a></p></br></br></br><p><font color=\"red\"><strong>Gift Givers:</strong></font> This item ships in its original packaging. If intended as a gift, the packaging may reveal the contents.</p></br>\r <p>PRODUCT FEATURES</p>\r <ul><li>Auto-iQ Technology features timed intelligent blending programs that do the work for you.</li>\r <li>XL Total Crushing Blender pulverizes ice to snow in seconds.</li>\r <li>Pro extractor blades break down whole fruits, vegetables, ice and seeds flawlessly. </li>\r <li>Maximum nutrient and vitamin extraction is delivered with each recipe.</li>\r <li>BPA-free construction offers peace of mind.</li>\r </ul>\r <p>WHAT'S INCLUDED</p>\r <ul><li>72-oz. pitcher with lid and pour spout</li>\r <li>32-oz. multi-serve cup</li>\r <li>24-oz. regular multi-serve cup</li>\r <li>18-oz. small multi-serve cup</li>\r <li>Three Sip &amp; Seal Lids</li>\r <li>Auto-iQ Program Guide</li>\r <li>Let's Get Started Assembly, Tips &amp; Recipes</li>\r \r <li>Instruction book</li>\r </ul>\r <p>PRODUCT CARE</p>\r <ul><li>Blades, cups &amp; lids: Dishwasher safe</li>\r </ul>\r <p>PRODUCT DETAILS</p>\r <ul><li>1500 watts</li>\r <li>2HP motor</li>\r <li>Model no. BL-642 </li>\r </ul>"
    bot.reply(message, {markdown:"**Here is more info on the Nutri Ninja Blender DUO:**"},function (err,mess){
        bot.reply(message, {markdown:html});
    });

})


controller.hears(['.*independent review.*'], 'direct_message,direct_mention', function(bot, message) {

      bot.reply(message, {markdown:"**Here's a review from CNET:**"}, function(err,mes){
        var file = "https://cisco.box.com/shared/static/83bvo3e3j9lvym0a4t79942wosu9l86w.png"
        var content ="**The Good** / The **Ninja DUO** blender performs as well as models that cost twice as much.<br><br>"

        content +="**The Bad** / The **Ninja DUO** looks bulky and you may not like having to keep track of the various accessories.<br><br>"

        content +="**The Bottom Line**  / If you're looking for a blender that can replace a lot of your small appliances without breaking the bank, you can't go wrong with the reasonably priced **Ninja DUO**."

       bot.reply(message, {markdown:content,files:[file]});

      });

})

controller.hears(['.*help me.*'], 'direct_message,direct_mention', function(bot, message) {
  bot.reply(message, {markdown:"Sure we can help you! Tap the link below to be connected with a customer support representative<br><br>"+sipUri+"<br>"});

  //bot.reply(message, {markdown:"Sure we can help you!<br>[Click here to call Customer Support](ciscospark://call?sip=sip:"+sipUri+")"});
})


controller.hears(['set uri (.*)'], 'direct_message,direct_mention', function(bot, message) {
  sipUri = message.match[1]
  bot.reply(message, {markdown:"new sip uri set"});
})
