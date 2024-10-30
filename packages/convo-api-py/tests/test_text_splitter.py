# flake8: noqa
from convo.embeddings.convo_text_splitter import ConvoTextSplitter


def test_text_splitter():
    sp = ConvoTextSplitter(chunk_size=300, chunk_overlap=20, overlapSep="::")
    txt = sp.split_text(
        """so anyway let me show you how I make every model from a financial acquisition
to uh just how I like look to buy a stock as well you know what's amazing
about this method is you really don't need anything other than Microsoft Excel if you don't have Microsoft Excel you
could always use Google spreadsheets which I believe is free so in any event um we're going to do Tesla and again the
goal here is to actually try and value the company so I'm going to be using all publicly available tools you know the
the most important website is the sec's website which for a long time I actually had it as my home page you know the
SEC Website
sec's website is is really convenient I actually have this page as my home page and it's actually not a bad home page to
to have if you're really serious about about this and so the first thing I look
at is called the 310 cues per year and the 10K so for those of you who don't know what that is these are quarterly
statements filed by the company with the SEC and the executives have to swear on
them basically or they can get in big trouble so they have to be correct and you can look up any companies
um ticker symbol and then look up their financials pretty easily so where do we start here so so yeah so it's easy to
look up kind of any company you'd like and oh I wanted to say that if um you this this video and others like it
will presuppose that you know a little bit about finance and uh or maybe sometimes even a lot and so if you're
really truly a beginner I'd say the best place you can go is Bill Ackman um uh did this thing uh on something
Bill Ackman
called The Floating University and it was um pretty cool because it was super basic
uh and so if you don't know anything about Finance you can do this I'm not
necessarily a fan of Bill Ackman so don't uh don't mistake that for an endorsement of
Bill Ackman but I think the idea that you you can at least I think when I viewed this for a few a little while he
sort of explained what shares are and market cap and stuff like that I'll go through some of that quickly but
um you know I'm gonna I'm gonna assume you know some stuff so looking up a stock price is pretty easy you know Yahoo finance is perfectly fine I know
Stock Price
you know billionaires that use Yahoo finance you don't need fancy quotes you don't need you don't even need real-time quotes really so anyway the stock price
is about 208 dollars which you know again we won't obsess too much over that and so we pull up the most recent 10q
and what's kind of interesting is there's um two places to get the number of shares and these are the six kind of the
six things that you need to know about every company no matter what and it's the six things that I kind of conceptualize anytime I think about any
company which is the price um of the share which is kind of arbitrary right you can have fewer
shares in a higher price or a lower price and more shares and it kind of doesn't matter but um the next element is the shares so
the shares you can see here it's always going to be on the front page of the 10q which is kind of neat and we'll talk
about um that in a second but as of July 30th there are 127 million shares I'm just going to type in 127. you'll really want
to be perfect you can type in the number of shares and if you multiply the two you get the the market cap so to speak
of the company which is every share and the price per share means that all the shares together are worth 26 billion
dollars and we're going to do this all in millions because that's what real Ballers do is we do things all in
millions and so anyway um this is 26 billion dollars so the whole of Tesla is
Balance Sheet
worth 26 billion dollars which is um a lot of money but if you also think
about it um that's kind of considered a almost a large cap company not quite
um it's you know not as big as a Facebook that's a 300 billion dollar company or
um something like that um so anyway uh the next element is the
balance sheet which is ironically you know uh at least in this 10q the first financial statement there are three key
financial statements there's some times the called The Holy Trinity it's a balance sheet the income statement and
the cash flow statement so we'll start the balance sheet and you look at the first line of the balance sheet the balance sheets ordered in liquidity so
it's assets and liabilities so you're just going to take the cash the cash is uh easy is important because it's
basically your cash if you want all the shares you can actually just take out the cash as you please
Cash
as a private company owner or a large owner or private company that's certainly is the
prerogative of the owner so if you're a part owner you don't get the same right but you still sort of uh
have that right so I'm just gonna do a little formatting here um so there's about a billion dollars of
cash sitting in in Tesla you know I include these marketable Securities I'm going to include this restricted cash in
a second so let's see it's 19774. okay and now there's uh there's gonna be
someone on a debt um and you know debt you know again watch the Ackman thing but that's not that's not kind of what you think of
when you think of like you know owing your credit card debt or something that is a tool to fuel your business so
there's a little bit of debt here there's a convert when Tesla did this convert I don't own any Tesla stock by
the way or or uh or short stock I probably wouldn't uh anyway we'll see
we'll see in fact after I'll tell you what after this exercise I will put a million dollars of my own money on Tesla
either for or against it or if we determine that it's um fairly valued I you know I won't make
any investment but you know we'll see what our exercise kind of yields and this will this will be pretty
complicated obviously um you know we're gonna need a lot of time to make this decision so maybe it'll take several
videos um but uh anyway I'll at least give you a start of kind of the way I look at it
so debt um is about 2.6 billion um none of these other things you can
think of capital leases sort of as debt um resale value guarantees we'll look at
that later that sounds suspicious could be debt but either way none of the none of these are enough to kind of sway the
fact it's a 26 billion dollar company so if you subtract the cash and add the debt which is the net cash in essence
it's really a 28 billion dollar company because if you did take this over you'd actually technically be in 1.5 billion
dollars of debt to someone which you kind of add to the value of the company so that's kind of how we look at that Enterprise Value and if anyone wants me
to explain this anymore um I prefer that you uh uh yeah prefer that you probably uh look
at the Ackman thing until you get uh until you get it um figured out and yeah you're welcome
and I will post this on YouTube or something I don't know so and then I'll play League of Legends
uh probably at some point so in any event the shares outstandings listed here again that's 127 million and
there's other things in here that we'll deal with in a second that are pretty important but that's kind of the very first thing I like to do is just say
Notes
okay what am I dealing with here uh you know and you can do this for a two million dollar company right you can do
this for a 20 billion dollar company or 400 billion dollar company it doesn't really matter you can do it for a private company you still need some
element of the so-called capital structure and this is an Abridged kind of capital structure so the way I build
my models is I like to put notes on this front page that kind of are an overview uh you know what does the company do and
I think you know we we thankfully that's pretty easy for this kind of a company we we know what Tesla does uh but you
know there are sometimes you know um details like for example here you see that Automotive revenue is you know
roughly 90 so we can see exactly how much uh 92 percent and then services are
only eight percent so it really is a 92 percent of sales or automotive and I
assume that means cars but you know it's just you never know these things so uh
so I like to make notes um just so I sort of have a fundamental understanding of the business maybe
write the prices of the cars or something like that but the the real meat of it comes in this model and so
we're gonna make this model really really quickly um
and so um you know it'll be um
it'll be a little bit hard to understand but you know that's life
um and I'll certainly try if there are any questions to sort of guide you a little bit
um let's see if I can do it like this can you move the cam or the notes please
no actually oh your face is blocking the notes section okay sorry so that's
that's the notes it's pretty pretty stupid um for now but they'll get complicated
and the um the uh sorry I'm just looking at all your dumb
comments um the yeah the notes are you know the good thing about these models is you can
Save Model
save them and I'll actually save this real quick and I'll just save it to uh something oops wait let me just well you
know what I like to save it as is just t s t s l a is what I will save it as
later I guess I could move the the face
let's see so we're gonna do this model really quickly uh and we'll try to get an approximate
value for Tesla shares it's not going to be we're not going to be able to do this that fast but um we'll give it a shot so
Add Revenue
um Q2 15 uh Automotive uh Services add the revenue and so you
know you can do this with Excel you can do this with Google um you can do this with Google
spreadsheets uh and you can also uh even do this on graph paper you know uh I
know the Warren Buffett method and you can actually sort of do this with your
own two hands if you really felt like it um so
uh
uh well we should be doing this in millions so it kind of um you know what we can do it in thousands that's fine
thousands is significantly less baller as I explained earlier I don't like dealing in thousands
I'm just kidding around of course
so um who am I gonna start playing CS go never
okay so that's Q2 and then you know it's nice I can just copy and paste and pop in the q214 numbers
uh
I can't believe I'm getting my secrets away to the world for free but
um whatever okay so I like to make a line here just to separate the expect or the how should
I put this the uh um actual from the expected so that's
the actual and the expected is coming uh and forecasting is really about the
future as we all know but
and I'll show you kind of like the forecasting methods I like to use but you know populating a couple of quarters isn't going to kill us
um we'll do the balance sheet we'll do all this stuff so what are you all saying uh
post the excel in Google Docs that's a great idea I I will I will do that um
I will do that okay so let me just uh finish this up 46 560.
Build Annuals
48 and 62. you should never use uh the mouse with Excel that's a basic
you know if you can't do it without a mouse if you if you need a mouse to do it then you shouldn't be doing it
OG kind of method
okay so now we got two quarters in there and we can start to build the annuals because annuals are going to be
kind of what really drives it
and we're going to start a little bit of forecasting right now assume the Share account stays
the same and I'll have a lot to say about that shortly and you know we'll start to populate
some basic um
some basic kind of stuff like uh Revenue growth so it's always new divided by old
swans expressed as a percentage see Tesla degree Revenue 24 year over year
and then 51 your rear of the Year prior uh gross margin is going to be low it's
a car company after all but 22 gross margin um and then we'll go through kind of um
some other parts of you know what really is gross margin because cash gross margin and reported Gap gross margin are
quite different beasts so um we're gonna go to Tesla's website and do a little
bit more how many hours do you work a week all of them why not write a program that does this automatically that's a
question I get a lot it's a terrible idea don't don't uh don't do that you know that is a bad
Investor Relations
idea you you want to kind of understand what your what you're doing it's it's a it's
important um to sort of not try to shortcut it and it's pretty fast as you can see it's not
a lot of work I mean after five minutes if you're already asking yourself how do I automate this you're probably in the
wrong field um so let's look if we can find the Tesla investor relations site and every
every um every company has an investor relation
site somewhere and um this one appears extremely hard to
find but I think we can there it is ir.teslamotors.com sometimes I like to
bookmark these as a bookmark it because I might be coming back and you want to look for press releases
yes you're just watching this guy work what do I think of high frequency
trading uh I have a lot to say about that um discuss that
um what are we looking at we're looking at me playing a video game called Microsoft Excel it's a lot of fun
uh how do I calculate gross margin it's just gross profit divided by um Revenue
so it's the kind of percentage of Revenue that the company keeps again you
might want to watch the the Ackman thing uh but yeah I know I'd be happy to discuss high frequency trading at some
point we'll read the press releases in a sec oh actually they do have the third quarter out there's no 10q available but
that's uh that's useful uh this is a little annoying
okay so there's the uh the income statement for yeah they're
earnings posted today so the queue is not going to be out for a while but that's okay we can just uh
looks like they had a down sequential quarter that's no bueno
um but you know maybe that's their seasonality so we'll look at that in a second
sometimes it's normal for the summer to be slow for many businesses
it's even the case sometimes in Pharma
and this is this is the way you should invest you know I don't think you can invest based on a gut feel or something
like that you got to do calculations and it's painful and no pain no gain you know I was sort of the words I live by
because I think you know anyone who's selling you that you can just kind of look at it and figure it out really
easily is bullshitting you you know that's not really the way it works you need to do
painstaking kind of careful analysis and even even after you do the mathematical
analysis obviously you still need good good intuition and instincts and all that but you know I'm a really sort of
quantitative person in general and it's it's really important to in my opinion uh sort of do it like this
it's the only method that I know is very consistent results that are at least have been very positive for me
I think I made a typo let's see I need a type of somewhere
yeah there it is okay
all right so you can see Revenue growth slowed for Tesla to ten percent uh which
is really uh interesting uh thing here is the revenue was 51 Revenue growth uh
then it was 24 now it's 10 and that's kind of curious and maybe they have an explanation for that is this a new
Champion not League how do you type in so fast in Excel well I'm a beast so
that's sort of that's sort of how I do that I like the candlesticks yeah don't don't do
technical analysis that is a a bad thing you will not make money are
we watching the stream inside your stream about your stream yes that's exactly why is technical analysis bad
because it doesn't work it it uh it has no there's no rational reason for it to
work um and and I'll explain that in a second quantitative analysis has changed
ability for technical analysis to work so it's now shifted to quantitative analysis so
no uh no we're not competing with people with Insider information okay anyway
let's get back to uh work okay so I got three quarters out of the four um and there's going to be important
metrics and things that we're going to have to look at and follow and there's captain on Gap Corrections and this is going to
be a lot of revisions to this but you know first things first let's get
um all the quarters and then so we've got most of them but let's uh let's go back to the press release and
find the q414 press release because it's sometimes
easier to read from the press releases necessarily than the the the cues in K's
okay all right so this is a little frustrating uh because they have this
weird shareholder letter thing that most companies don't have but yeah whatever we found it okay
so here's their q414 and not surprisingly that is their big quarter
and they had no no Services Revenue which is kind of interesting because I guess that's a new business line for
Q414
them uh Services Revenue which is really interesting I think
okay so r d uh 139 565 196.70 interest income plus
257 okay for 13.
um q413
someone wants to ask me if I'm I'm dyslexic uh I'll let you guys do the
judge of that
okay all right so confirm what they say
confirmed Revenue growth decline 55 Revenue growth 51 24 10. four quarters
in a row declining Revenue growth so um let's make a quick and dirty and these forecasts aren't meant to be accurate by
the way there's there's an accurate way to forecast and this is not that way but let's just assume they grow 10 per annum
um and you can see the services revenue is growing a lot faster so you know let's let's actually
let's just break out the automotive growth versus the services growth and
let's just do that so the automotive growth is really slow now it's only seven percent growth whereas the
services are kind of growing on a different growth pattern so let's assume the services grow a little bit
differently and then on the gross margin let's um
let's assume there's 25 inverse margin
um and we'll just sort of leave that blank and then on R D um in whatever let's assume uh
sort of five percent r d growth and SG a growth and these again these are not
meant to be these exhausted good because these are really placeholders more than anything
um taxes Tesla doesn't make money so they have the fortunate uh
situation where they don't have to pay taxes um
and you can see even with substantial growth um you know they're still not quite going
to be making money anytime soon and so that's where the annual perspective comes in yes one more
to make 5416 we'll soon have a reasonable I want to say it's a good forecast but
just sort of a starting point for basic operations which again you need
something like this to even begin the process of forecasting uh
it's fun
it's definitely a mistake here somewhere give me one second to find it uh
I see um
okay still a mistake here somewhere
aha perfect
okay cool so um let's sort of continue let's assume
they grow ten percent for a while and um
let's go to the gross margin line again of course margin Line's a little tricky
because they have this bifurcated gross margin and let's assume like gross margins pick
up a little bit over time so maybe they can get to 27 which is a little unprecedented for a car maker but you
know we'll talk about how to forecast gross margins and think laterally about kind of what what is it Tesla is really
trying to accomplish which is a tough um similar tough question to answer
and so let's um pick another line here
15. uh no 2015 is not done so put it there
and we can also make the 2014s
okay so you know within 10 minutes we've got a pretty
um let's say intense model but starting to get there
um you know forecasting interest income is a little tricky so we're just going to zero it out for now and I'll show you why
um and then we're gonna assume there's a tax rate when they get profitable or no 25 or something
and then we'll um assume the flat Share account so
what is Tesla worth um so we're going to need a maturity
um for the cash flows after our forecast period which will end in 2024 just
arbitrarily and let's say they they grow one percent of maturity which is pretty egregious assumption because
I typically don't like businesses that have any maturity I don't like to assume any business can
grow in perpetuity which is kind of what the maturity um aspect is we need a discount rate
which will kind of arbitrarily assign for a second and we can already arrive at the simple MPV this is super simple
um super super simple but it's still an npv so this is the moment of uh this is
sort of the Judgment tie judgment uh how should I put it this is the the important uh decision so calculation
yields um uh a pretty interesting number of uh
four billion and so per share that's um
that's only 33 dollars a share so um and we're not ready to make a
decision on this or anything yet but but basically at least if if Tesla grew
Revenue by 10 a year which by the way is kind of what they're if you look at it it's actually what
they're growing now so it's it's almost generous to say that they'll keep growing at 10 a year
uh so if they grew a 10 a year forever and expanded margins
quite a bit um from wildly negative to wildly
positive they they would uh the stock would only be worth 33 uh and the stock right now is trading
for 208 dollars so um that's a uh pretty massive short
um uh and then so we we gotta think about and I I don't like when I come up with
these numbers I don't say oh my God you know uh why are my numbers wrong let me start making my numbers higher I don't
think that's a realistic thing to do I kind of try to ignore the number until I have a better forecast
for instance my guess is Tesla is growing faster than 10 a year uh their capacity constrained they probably
um will be coming out some new cars and people are you know they possibly uh when they have more capacity they could
be growing so the models are good because they can sort of show you what you need to get you know what kind of growth do you need
to get the current stock price so let's assume they grow 20 percent
and that's for the next um eight years they grow 20 percent
um then the stocks were 156 dollars a share and that's a lot closer that's a
lot closer to 208 um so that in that case I probably wouldn't short the stock because you
know that's kind of within a margin of error that that's reasonable and if they grew
25 my guess is it would be a cheap stock right the stock well 236 it's not that
much more than than um the current stock price so probably not worth buying uh but you know it
depends on things like maturity rates so if they grew five percent a year forever which I don't think they could and
remember I'm saying growing cash flow which you know is is an interesting concept
um then um you know the stock is worth 400 a share which is a double in the
stock price and if they if it's you judge the project to be less risky uh
like an eight percent discount rate and I'll try to explain what discount rate is in a second again this is sort of an intermediate
Finance knowledge is assumed then the stock is is more than a double it could be a triple 208 dollars to six hundred
dollars uh if you think it's a really risky project then a 15 discount rate negative maturity you know it's easy to
see even with Tesla growing to a 27 billion dollar company
and we're going to look up what Ford is doing in revenue and GM and stuff like that to see how realistic this is uh and
some other proxies um it's a little tricky to sort of see this being a valuable a good stock to
buy um but you know uh because it's hard to grow 25 a year forever now there are companies that have done that and it's
it's not really a law of large numbers thing um that's not the right way to forecast I see a lot of people make that kind of
rookie mistake they say okay well you know they're growing 10 right now that means they'll never grow faster than
that um that that's not realistic right there's there's lots of reasons why they could keep going faster or slower and we
gotta talk about that so yeah yeah no we'll we'll talk about the
revenue and cost of goods the cost of goods is run through uh gross margin so you know there's no actual cost of goods
forecast just the gross margin here's the gross margin we have gross margin going up from 25 to 29 so for huge gross
margin expansion so we've built a basic infrastructure of a model so this is more or less complete in terms of the
income statement we're gonna do the balance sheet in a second then the cash flow statement but this is the income statement and that's uh
you know uh quite a bit why am I discounting net income and not cash flow well not income and cash flow
approximate each other over the long run as depreciation and capex equal out so
we'll talk about that um certainly um we'll talk about the batteries relax
okay so uh okay so we've got the basic framework for model and I think that's
this is not nearly enough but but it's important to say you know this npv
uh and then we gotta we gotta add the cash of the company in the
crack the debt or subtract the cash and add the debt so we should do that just for
and dollarize it to the correct um number of zeros so that adds
that uh well we're actually gonna do the backwards we're going to add the cache and subtract the debt
to get the Net Present Value so it'll subtract a few about a billion from the
solution and uh in terms of discount rate and maturity rate and we're going to do
something uh even more complicated than that shortly um you know we'll go through all that
um but for now that that's where we'll kind of leave it let's go back to sort of so this is sort of the
first step for any company it takes about half an hour as you can see and now the real work has to begin right we
need to put real meaning into these numbers you know these numbers are pretty much worthless right we have not done anything that
requires even a brain to do this is all really dumb work that
um it's just meant to set up a playing field it's like setting up the pieces of chessboard or summoner's Rift
um we're just gonna we just have a basic setup that we can
now play with to sort of arrive at some more legitimate um conclusions so let's go back to the
Press Releases
shareholder letter now we're going to actually do a little research and Analysis okay so um when I read a press release I
especially the quarterly the four quarterly press releases are are the most important
press releases so let me do this okay so when I read a press release I really try
to read it carefully because there's only four of these a year that matter right the q1 Q2 Q3 Q4 price releases and
everything else you know matters too but these are really important I always try to keep a lookout for the numbers uh so
if you see uh because you can kind of put them in and try to forecast and keep track of some of these things uh
autopilot released to 40 000 Vehicles globally globally over the air so I'm
gonna start putting in autopilot
and maybe we'll track autopilot and we'll kind of see how to do that um they produced a record 13 000
Vehicles so uh production we'll just call that production
ASP
despite a one-week shutdown okay so what's cool about this production number is the vehicles number uh and so what we
can do is we can do something called ASP and ASP is average selling price so you can kind of do Automotive Sales divided
by um and if you do Automotive Sales in dollars so you
multiply by thousand eight hundred fifty two million dollars I would divide that by the average selling price or I'm
sorry the production number which is they sold 13 000 cars for 850 million dollars so in essence each car costs 65
000 and that's something that we want to monitor carefully um
as as time goes on uh so that ASP number is going to be really important because what we can do is we can actually start
to forecast production instead of forecasting um Revenue growth blindly and in fact
I'd like to do that right now so 13 000 cars isn't a lot you know I I don't know
how many cars are produced we'll be looking that up in a second in the United States but my guess is that number is in the perhaps even in the
millions so if you do 13 000 a quarter um you know you're doing uh 52 000 or so
right uh a year and so their market share has got to be really low so they probably can can increase their
production as they increase their capacity quite a bit so what you can do is you can kind of hold ASP static or
you can forecast uh potentially ASP dropping you could
um just do it as a luxury proxy there's there's a few ways to do it but anyway if we assume asps are flat you can
actually kind of generate or look at um uh Automotive uh Revenue through that
lens so if they just add a thousand cars right a thousand cars per quarter you
can start to think about what does revenue look like if you do that um a thousand to get the right number
but that is kind of an interesting way to look at it because it will give you a better forecast in essence and um
like this and you know this is uh I'm not trying
to Pat myself on the back here but I do think this is a really you're not going to get this level of
um I think analytical Insight or or I don't know of anyone
that's that's sort of going through this with people and I think this is a let's say it's a c Grid
or something but it's it's certainly it's I think good for folks to see how you would do this if you worked at a a
big hedge fund or something and I think I know a lot of hedge funds that they don't even apply this level of rigor so
um so let's assume instead of putting these blind stupid numbers on Revenue growth we're actually going to instead
um forecast asp and forecast units and um nothing
revolutionary here but but kind of an interesting more interesting way to forecast Automotive Revenue than just
taking flat percentage growths which is a kind of a silly as I said earlier kind of a silly way to do it
um let's assume for a second these people know that these are not
right numbers okay so if we assume maybe we can assume asp's drop a little bit just because
you know their cars aren't going to be super expensive forever I don't think maybe maybe not I don't know
maybe they dropped by four percent a year that's that could that could be fair um but the number of cars they produce
will grow to 180 000 cars a year so if we do that
the revenue doesn't grow very much as you can see so uh you know that that's going to be
an interesting tell and I'll show you why in a second but we look back here and we see Tesla stock is only worth 26
dollars if this is the scenario which um would be a big disappointment for Mr
musk um but you know we'll we'll have to kind of keep working we're not quite there
yet um so let's see deliveries
do you live oh boy it's late or I'm tired um deliveries there we go okay so
model three launching in late March 2016. so um we can kind of put that here
model 3 launch gigafactory I'm gonna put that on the front page
what the heck is a gigafactory I don't know model X don't know what
that is so I'm just gonna put this down here for further further research maybe have one of my
grunts research that um I don't know anything but
Press Release
Pharmaceuticals so and so reading the press release you kind of want to go through it carefully but you also want to
uh all this stuff is a little bit um Pokey I mean you have to
vehicle electrification um I guess I understand what that is an
autonomous driving we kind of all understand what that is
um interesting two ground breaking new Innovations model X uh is the SUV
looks like the model X is the SUV um
foreign
autopilot I read an article about autopilot that sounded pretty cool Tesla Energy Products
with a gigafactory power packs and power walls okay
and yeah I now see what we're talking about with respect to the sum of the parts play so we'll certainly work on
the gigafactory in a second and then we also should do the Gap non-gap translations those are really important
and that's where we'll kind of maybe take a break and look at the cash flow statement and stuff like that well
Production
here's delivery guidance so that's pretty cool they're saying in Q4 we plan to build fifteen thousand to seventeen
thousand Vehicles okay so we'll actually put in the number of sixteen thousand
and deliver uh 18 000 Vehicles which will result in fifty thousand for the year neat
um so um yeah that's interesting so we'll look at that in a second but I kind of want
to get the production and delivery numbers for the last couple quarters so let's let's get that
and it looks like they kind of kind of put it in the yeah they put it in the
they seem to put it in the same place every time so let's see deliveries of 11 532 record
production of 12807 that was Q2 okay uh q1
uh now q1 okay
[Music]
404 file not found um
that's so strange um probably hackers
anyway we'll work on that later but uh there's sort of two interesting
facts we want to build in here kind of what is I don't know about global yeah maybe
we'll do Global we can do worldwide auto production or deliveries probably the
same numbers such a hard time spelling the word uavs uh and then US Auto production
deliveries because we want to get a sense for kind of what what kind of market share is this and I can imagine
it's it's limited right I'm sure Toyota sells a lot of uh delivers a lot more
than quite a you know probably a hundred times more as many Autos as Tesla which is the the
dream right is that they can get to that level of market share and that's you know we're going to sort of just assess
if that's realistic or not uh so record quarterly deliveries at 10
Balancesheet
45 11 160. okay so let's go through the balance sheet because that's
um important and I'm not going to Bill Ackman I sent the Bill Ackman link to the floating University if
you guys didn't get that um uh I think you should if you don't know
much about Finance then this is a really good place to go I don't necessarily love
um the Lackman but I still think you should watch that
um so anyway Let's uh let's do the balance sheet real quick um accounts receivable is money that the
company has owed from its customers inventory is really interesting and important for a company like Tesla it's
not so important for a pharmaceutical company I love all the cash together so
it's cash it's cash and I put it all in there
okay so they have six billion in assets uh now let's do the liabilities uh well
we don't type that just yet so accounts payable crude liabilities
deferred revenue I typically don't break out long-term and
short-term deferred revenues I'm just going to add that all up same thing with capital lease obligations
uh resale value guarantees I gotta learn something about this industry I don't
know what a resale value guarantee is but uh probably
it's a liability where they protect the price of the customer reselling the product or some like
that okay I think I got them all
yes and for shareholders Equity eldest
so everyone here should know that liabilities Plus uh shareholder equity
should equal assets and that's why a balance sheet balances so the two numbers you can see
are the same L plus s e those fault deposits this is
for Revenue approved liabilities accounts payable Okay so we've got the
balance sheet um starting to get populated here and you might ask yourself well how do I look at a balance
sheet oh I am very happy to tell you there's a lot of things I look at net cash is and this now you can see why I
kind of just collapsed all the cash in one and all the debt and the other so the net cash position is important they
have negative 1.5 billion dollars of cash and you can actually forecast future net cash like this you can see
that their deficit if you will will grow but eventually eventually
they'll um hopefully start to produce
and eventually maybe even have a positive cash balance and why is that important well it's actually because I
like to do this thing called roic so I assume that companies capitalistic Enterprises take
cash on their balance sheet and they actually invested and that's a really interesting
concept because a lot of people don't model that and and that's actually I think the most important thing that
people miss uh with respect to um
we'll talk about that later probably need to extend
able but anyway so the balance sheet netcash is one thing to look at accounts receivable is
is uh important as well um so DSL deals Day sales of outstanding uh
is is basically how fast the company collects and so you can kind of uh
just uh do that real quickly like this you see in about 14 days 14 days
of receivables um doing this right two times
yes so they have 13 days of uh receivables
um which uh is very low and that's that's uh interesting it's because it's a
consumer-facing business they get paid right away right if you go to a grocery store you can't say well invoice me you
know you have to pay right away but in in our business we actually we actually uh we send drug and uh we actually
sometimes can take 30 45 days to get paid uh for for legal fees I know that
often takes quite a long time to get paid especially if I'm your client uh I take uh forever to pay my lawyers uh
because I love them so much um just kidding if any of you are listening uh but yeah 13 days is uh is a
really fast kind of uh fast uh number to get paid on so um you
know the the pp e is really important it's not important for companies like uh touring or trophin or something but it's
actually a pretty pretty important line for an industrial company and um you know we'll talk about that in a
second so anyway this is the Q2 uh balance sheet so I gotta move all
this garbage over here um
[Music]
it's amazing to me you know this company loses 200 million dollars a quarter is worth so much because the the promise
of their potential future revenue is so high but isn't that just like biotech is it isn't
it um so now you have the sort of format for for this so this is pretty easy to pop
in the other quarters and if you get Adept it becomes
just as easy as it is for me now
customer resale value guarantee
okay deposits I guess they hold their customers cash
always a good thing when you can do that uh that's called float
you can invest float which is very nice
okay so those are two two of the quarters of um the balance sheets now we're going to
look at the cash flow statement which I know someone asked about and this is going to be really fun what's a cash
Cash Flow Statement
flow statement um it's really complicated actually and so uh we're going to attempt to do it
so amazingly the reported net income and the actual model net income are the same
uh but you can see here actually just really quickly you can see that they reported 154 million dollar loss right
in q1 that's easy to understand net loss 140 154 million dollars in q1 2015 March
January 1st to March 31st the cash flow the cash flow was negative 131 million
so they lost 131 million dollars of cash out of their
Bank uh basically their bank accounts now you might say as novice well wait that doesn't make any sense so if they
lost 154 million why didn't they lose 154 million and the answer to that's
really complicated um uh it's it has to do with accounting accounting tries to measure
uh uh it's Gap accounting especially tries to measure
how do I put this so it's coherent um it tries to measure the economic reality of the business whereas cash
flow is literally just how much did the the cash move from from one side to the other and if you know accounting which I
assume you do which is not a fair assumption you understand that there's accounting things that have nothing to
do with cash like stock based compensation you have to value your the stock you give away to your employees
um which you don't really know what it's worth in fact it's it's not knowable uh by definition
so but you still have to try to come up with a number and expense that number and that's
um you know not a cash item so that's one reason why reported net income an
actual cash flow will differ and uh some of that is pretty technical
but you know the good the good news here that always good news or bad news but it's the news here is that the at least
that the cash flow from operations and then that income are somewhat similar so
um you know a lot of businesses it's not the case I'm assuming in Tesla that it's going to be really important to watch
for a long time um and I'll talk about kind of other styles
of analysis and how other people might look at a company like this and why I think it's an inferior method
um I won't name names but I think some of you in finance may may know the
kind of the kinds of funds I'm talking about and they're not exactly um inferior too much I mean it whatever
works could could is a good idea and there are ways to actually trade and make money I'm not being 100 pejorative
of Traders there are wonderful Traders and I'll try to work in kind of you know how do you
actually trade so to speak I've always found myself to be better investor than Trader uh I lose money when I try to
trade and I make money when I try to invest typically um not always but I know a little bit
about trading and I can kind of try to show you um I'm not very good at it but I can
certainly um articulate kind of what the point is um
of trading okay so a lot of these are very tiny uh
changes that are not going to be important but to be complete you know you might as well do it
okay so this sort of tells you what the cash flow changes are
that's uh somewhat important um especially for a company like Tesla so let's look up
um so we did the you know sort of the uh three balance sheet income statement Etc but
let's look up let's go to Ford for a second because that's going to be that's going to be
fun to sort of see what what does Ford look like relative to Tesla because is Tesla's future might be Ford on the
other hand Tesla's future could actually be something more like an apple where it's not so much
the the it's sort of a new way to look at
um what they're doing it's a luxury consumer good that kind of transcends what you thought about the goods and
that's kind of what Apple did to the cell phone so we got to think about that um a little bit but you know for for
Ford vs Tesla
traditional sake let's look at Ford and you can see for their quarterly Automotive revenue is 35 billion
so it's about 35 times the size of um
of Tesla in terms of Revenue uh and uh I find it fascinating that
their Automotive revenue for it actually grew faster or just as fast uh
um just as fast as Tesla's Revenue which is probably not a well-known thing right
I mean that's it kind of makes you wonder right um it definitely would make me wonder I
was a Tesla shareholder so why is Ford growing faster than my
amazing company and the answer is probably capacity right it's just that Tesla just can't make their
cars fast enough um so but if I just quickly mock kind of
did what's the growth rate oh it's faster but it's similar right nine percent versus seven percent so it's a
little faster uh but you know isn't isn't uh Tesla supposed to be the super fast growing company meanwhile Ford's
revenue is higher just an observation I know it's not Apples to Apples because the capacity issues but certainly
interesting um I'm gonna try to eat this spring roll while I talk to all of you um and so finding the Ford uh investor
relations may not be totally easy actually there it is and hopefully they
talk about deliveries and stuff like that well you can see that they're in the U.S they're selling 200 000 Vehicles
a month a little hard to annualize that one way to do this is to just to Simply look at these
these uh monthly sales that they report so October
sales were two hundred and thirteen thousand and that's a month in a month
so forged deliveries 213 938 times 12 times 3 it should be
three times three three months three months and a quarter so okay so this is really interesting so
you've got Ford shipping 640 000 cars a quarter
while um and the revenue you've got there which is 35 billion
and so you can actually calculate their asp
and you can see that Tesla's shipping 13 000 which uh
something seems off here I don't think Ford is generating
fifty thousand dollars of asp oh I think I know why because this is just the U.S sales so we need the global
sales so this is Ford's view uh U.S deliveries and that's
towards um Global or worldwide Revenue that's why this isn't really adding up so that
makes sense um so it'd be nice to have just their U.S revenue and that's actually in here
so now it's North America so that's maybe not quite what we uh well that's
income we want Revenue yeah 23 billion so that makes a little more
sense but obviously that's something Americas would include South America so not going to be oh no it wouldn't just
North America so Mexico and Canada and those aren't really real countries so
I'm kidding of course they're real countries okay so that's a little more realistic
they're they're selling the average car for 36 000. we know it's not perfect right because we know that
um we don't really calculate the deliveries number we didn't really um separate out just the US et cetera et
cetera but it gives you a proxy which is what we're looking for in models which is uh that you know you've got four
delivering half a million or 600 000 cars a quarter and you've got Tesla
delivering a paltry you know thirteen thousand and you know objectively speaking it's reasonable to think that
if Tesla had the capacity they could equal Ford's market share someday and so Ford is actually if you
if you really want to look at it like this there they're doing 2.5 million 2.5 million
cars a year so the idea that someday Tesla will do 200 000 cars that's really not a stretch
right because if you see if you can see them uh doing and that's why that's why Tesla looks so expensive the reality is
it might not be so expensive because um you know earlier just to make a
placeholder model I was adding a thousand deliveries or Productions per quarter well maybe I should be adding
five thousand because what if they get their production online and they start to do 5
000 more per quarter that's more realistic because again right now I mean if I could I don't even have driver's
license but if I could buy a Tesla car I would uh thing is so freaking cool um and you can see that over periods of
time you know this whole idea that you should be doing these forecasts as
kind of law of diminishing returns or law of uh what do you call it uh law of
larger numbers uh that's not realistic because ultimately um
you know that uh you know what's driving the growth is not some numerical thing it's really a a
more complex uh um situation than that so anyway let's assume they can get to 20 30 20 or
30 percent of where Ford is today in 10 years doesn't that's not so reasonable right I
mean that's not so unreasonable you know I think that's that's that could that could work and we'll look at proxies to
sort of think about well why 20 or 30 let's imagine that that's what happens uh and they they have higher margins
because they realize kind of slightly better efficiencies we're all assuming that their asps drop
quite a bit because they're only playing in the luxury market so let's kind of
assume they they drop a little bit faster you know so they start their ASP start to look closer to Fords maybe that's a
little too fast 95 percent uh and they go Downstream to the other
folks and let's say they're they're selling General administrative that's
going to grow a little faster than than maybe we were forecasting a lot
faster probably so let's say that goes 15 20 for a little while
and then eventually their their production slows down okay so what's the share price now
um if they can get to 20 or 30 percent of where Ford uh is and that's just for
North America right that's assuming Tesla never can really crack uh the rest of the
world um so this is really you would argue in one hand it's conservative on the other hand right now
they're they're such a small saying that they'd have to grow 10 times
where they are now to get to what I'm talking about but again you can kind of close your eyes and realize uh imagine that you know
that's not so unreasonable um given the amount of demand they have so anyway if that scenario happened they
got to 20 to 30 market share not market share but 20 to 30 of where Ford is and Ford has about seven percent market
share globally in the US their marketers play higher so think about that scenario and you'd
see that the stock would be worth two hundred and fifty dollars and that is not a lot uh more than the
current stock price which is 208. or 220 as someone pointed out it doesn't really matter
um you know obviously these numbers like the discount raid and and the the maturity all these things matter a lot
and if you're really bullish on Tesla and you say you know Martin that's a slam dunk there's no way that they do
worse than that I suppose you could make the discount rate lower um I don't like to to do that so you got
to think about cost of capital and this is extremely Technical and I actually think even if you try to learn in school
you're not going to get a good um understanding of how to use discount rates it is something that takes uh a
long period of time to really understand what you're trying to embody and discount rate what it means but let's
let's try um you know seven percent and now you get a 300 stock price which is good I mean if
you buy something for 200 and it's all for 300 you're pretty happy um uh but you know the discount rate
just changing it by one percent really really dramatically changes yeah and again I'll someday give you
give you all insights on how to look at discount rates obviously maturity matters as well
if they can hold that market share forever then um that's pretty neat
um if they can kind of grow it oops and grow it a little bit uh that's reasonable so you know with
with a couple of reasonable adjustments I think musk does great investing work I mean what he's putting the capital into
is pretty good so you can get a double in Tesla stock pretty easily here
um if they continue to be hot and they continue to grow for the next 10 years but that's a big you know I don't know what's going to happen in 10 years I
don't know what's going to happen next week uh so assuming that Tesla is going to stay hot forever that seems like uh
uh a tricky kind of tricky proposition um it's possible certainly that that
won't happen and if that doesn't happen this the stock is not worth very much so
um a little tricky and difficult to think uh through so we've been at this for about an hour
um we certainly don't have a decision uh but but what the model is good for is
it helps frame expectations right you don't always go into this saying okay I'm going to Crunch a bunch of numbers
and it's going to give me this you know this number and this number is going to
be the be all end-all that's the wrong approach I think to model that that's going to steer you in the wrong
direction I think a lot of people do that and that's unwise um the model is meant to sort of be like
a mirror you're supposed to see a reflection in it and uh contemplate uh the universe that's how uh these models
work they're a lot more uh uh cerebral and uh intensive tools then
kind of trying to be um just punching in numbers and seeing what comes out at the end that's not the right way to use it you have to
use it to to frame expectations like this you know this model this
eventuality this instance if you want to use sort of a Computing term it contemplates a 27 billion dollar Revenue
Tesla right now they're a four billion dollar Tesla so much bigger Tesla
not you know I mean at this current rate of growth remember the rate of growth right now is 10 so
at this rate of growth they could never be that big of a Tesla it would take too long they really have to start growing
again aggressively like 100 growth or 40 growth right now they're running 10
growth so this is a little bit of a silly silly view but even with this silly view you don't get much upside I mean
um I don't think it's it's it's that likely that they can grow they're growing 10 now is it really that likely
that they're going to jump to 100 or 50 growth that seems a little foolish you
know one of the things I would monitor is the waiting list for the car you know uh uh the demand Etc
um but you know it seems a bit foolish to think that they could just jump from from no growth right now or Sub sub
Ford's growth to some amazing growth level I mean that that seems a little silly and I I would investigate this
whole capacity thing is are they really truly capacity constrained or is it more of um uh you know are they still
capacity constrained and there's no capacity constraints that they would sell 20 billion I don't know you know there could be a way to quantify that
and I think we can go through that but this is you know again the goal isn't to actually have a number if you could if you could solve a stock price number in
an hour you would be um a really rich person uh you you you go through hundreds of stocks and find
the one that was really undervalued and buy it and find the one that's really overvalued and short of and that's why
this this isn't a one-hour process it's like a hundred hour process or longer but this is sort of how I would get"""
    )

    print("len", len(txt))

    i = 0
    for p in txt:
        print(p + "||\n")
