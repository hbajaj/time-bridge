/* Curated major-city index for World Clocks and meeting locations. State/province coverage is a searchable baseline, not an exhaustive municipal gazetteer. 
 * Geographic IANA timezones distinguish border regions where needed. Maintain entries by state; no geolocation/network calls. */
export const MAJOR_CITIES = Object.freeze(`US|Alabama|America/Chicago|Birmingham;Montgomery;Mobile;Huntsville;Tuscaloosa;Auburn;Dothan;Decatur
US|Alaska|America/Anchorage|Anchorage;Fairbanks;Juneau;Wasilla;Ketchikan;Sitka
US|Arizona|America/Phoenix|Phoenix;Tucson;Mesa;Scottsdale;Tempe;Flagstaff;Yuma;Chandler;Glendale;Prescott
US|Arkansas|America/Chicago|Little Rock;Fayetteville;Fort Smith;Springdale;Jonesboro;Rogers;Conway
US|California|America/Los_Angeles|Los Angeles;San Francisco;San Diego;San Jose;Sacramento;Fresno;Oakland;Long Beach;Anaheim;Irvine;Santa Barbara;Santa Rosa;Bakersfield;Stockton;Riverside;Berkeley
US|Colorado|America/Denver|Denver;Boulder;Colorado Springs;Fort Collins;Aurora;Pueblo;Greeley;Lakewood
US|Connecticut|America/New_York|Hartford;New Haven;Stamford;Bridgeport;Waterbury;Norwalk;Danbury;New Britain
US|Delaware|America/New_York|Wilmington;Dover;Newark;Middletown;Smyrna
US|Florida|America/New_York|Miami;Orlando;Tampa;Jacksonville;Tallahassee;Fort Lauderdale;West Palm Beach;Gainesville;St Petersburg;Sarasota;Naples;Fort Myers
US|Florida|America/Chicago|Pensacola;Panama City
US|Georgia|America/New_York|Atlanta;Savannah;Augusta;Macon;Columbus;Athens;Roswell;Alpharetta;Woodstock;Marietta;Johns Creek;Sandy Springs;Gainesville
US|Hawaii|Pacific/Honolulu|Honolulu;Hilo;Kailua;Kapolei;Kahului;Waipahu
US|Idaho|America/Boise|Boise;Meridian;Nampa;Twin Falls;Idaho Falls;Pocatello;Caldwell
US|Idaho|America/Los_Angeles|Coeur d'Alene;Lewiston
US|Illinois|America/Chicago|Chicago;Aurora;Naperville;Joliet;Rockford;Peoria;Springfield;Champaign;Bloomington;Evanston;Schaumburg
US|Indiana|America/Indiana/Indianapolis|Indianapolis;Fort Wayne;Bloomington;Lafayette;Carmel;Muncie;Fishers;South Bend
US|Indiana|America/Chicago|Evansville;Terre Haute
US|Iowa|America/Chicago|Des Moines;Cedar Rapids;Iowa City;Davenport;Dubuque;Ames;Sioux City;Waterloo;Council Bluffs;Mason City;Coralville;Bettendorf
US|Kansas|America/Chicago|Wichita;Topeka;Overland Park;Kansas City;Olathe;Lawrence;Manhattan;Salina;Hutchinson
US|Kentucky|America/New_York|Louisville;Lexington;Frankfort;Richmond;Covington
US|Kentucky|America/Chicago|Bowling Green;Owensboro;Paducah
US|Louisiana|America/Chicago|New Orleans;Baton Rouge;Shreveport;Lafayette;Lake Charles;Monroe;Bossier City;Kenner
US|Maine|America/New_York|Portland;Augusta;Bangor;Lewiston;Auburn;South Portland;Biddeford
US|Maryland|America/New_York|Baltimore;Annapolis;Frederick;Rockville;Gaithersburg;Silver Spring;Bethesda;Columbia
US|Massachusetts|America/New_York|Boston;Cambridge;Worcester;Springfield;Lowell;Quincy;Newton;Somerville;Plymouth;Salem
US|Michigan|America/Detroit|Detroit;Grand Rapids;Ann Arbor;Lansing;Flint;Kalamazoo;Sterling Heights;Traverse City;Saginaw
US|Minnesota|America/Chicago|Minneapolis;Saint Paul;Rochester;Duluth;Bloomington;St Cloud;Mankato
US|Mississippi|America/Chicago|Jackson;Gulfport;Biloxi;Hattiesburg;Oxford;Tupelo;Southaven;Meridian
US|Missouri|America/Chicago|Kansas City;St Louis;Springfield;Columbia;Jefferson City;Independence;St Charles;Joplin
US|Montana|America/Denver|Billings;Missoula;Bozeman;Helena;Great Falls;Butte;Kalispell
US|Nebraska|America/Chicago|Omaha;Lincoln;Bellevue;Grand Island;Kearney;Fremont;Norfolk
US|Nebraska|America/Denver|Scottsbluff;North Platte
US|Nevada|America/Los_Angeles|Las Vegas;Henderson;Reno;Sparks;Carson City;North Las Vegas;Elko
US|New Hampshire|America/New_York|Manchester;Nashua;Concord;Portsmouth;Dover;Keene;Rochester
US|New Jersey|America/New_York|Newark;Jersey City;Trenton;Paterson;Elizabeth;Edison;Princeton;Hoboken;Atlantic City
US|New Mexico|America/Denver|Albuquerque;Santa Fe;Las Cruces;Rio Rancho;Roswell;Farmington;Clovis
US|New York|America/New_York|New York City;Buffalo;Rochester;Albany;Syracuse;Yonkers;White Plains;Ithaca;Poughkeepsie;Schenectady
US|North Carolina|America/New_York|Charlotte;Raleigh;Durham;Greensboro;Winston-Salem;Cary;Asheville;Wilmington;Fayetteville;Chapel Hill
US|North Dakota|America/Chicago|Fargo;Bismarck;Grand Forks;Minot;West Fargo;Jamestown
US|North Dakota|America/Denver|Dickinson;Williston
US|Ohio|America/New_York|Columbus;Cleveland;Cincinnati;Toledo;Akron;Dayton;Canton;Athens;Dublin;Youngstown
US|Oklahoma|America/Chicago|Oklahoma City;Tulsa;Norman;Broken Arrow;Edmond;Lawton;Stillwater;Enid
US|Oregon|America/Los_Angeles|Portland;Eugene;Salem;Bend;Medford;Hillsboro;Corvallis;Beaverton;Ashland
US|Oregon|America/Boise|Ontario
US|Pennsylvania|America/New_York|Philadelphia;Pittsburgh;Harrisburg;Allentown;Lancaster;Erie;Scranton;Bethlehem;State College;York
US|Rhode Island|America/New_York|Providence;Warwick;Cranston;Pawtucket;Newport;Woonsocket
US|South Carolina|America/New_York|Charleston;Columbia;Greenville;Myrtle Beach;Spartanburg;Rock Hill;Hilton Head Island
US|South Dakota|America/Chicago|Sioux Falls;Brookings;Aberdeen;Watertown;Yankton
US|South Dakota|America/Denver|Rapid City;Pierre;Spearfish
US|Tennessee|America/Chicago|Nashville;Memphis;Chattanooga;Clarksville;Murfreesboro;Franklin;Jackson
US|Tennessee|America/New_York|Knoxville;Johnson City;Bristol
US|Texas|America/Chicago|Houston;Dallas;Austin;San Antonio;Fort Worth;Arlington;Plano;Frisco;Irving;Waco;College Station;Galveston;Corpus Christi;Lubbock;Amarillo;Midland;Odessa;Brownsville;McAllen;Tyler
US|Texas|America/Denver|El Paso
US|Utah|America/Denver|Salt Lake City;Provo;Ogden;St George;Orem;Lehi;Logan;Sandy
US|Vermont|America/New_York|Burlington;Montpelier;South Burlington;Rutland;Barre;Brattleboro
US|Virginia|America/New_York|Richmond;Virginia Beach;Norfolk;Arlington;Alexandria;Fairfax;Charlottesville;Fredericksburg;Roanoke;Lynchburg;Chesapeake;Newport News
US|Washington|America/Los_Angeles|Seattle;Tacoma;Spokane;Bellevue;Redmond;Olympia;Everett;Bellingham;Yakima;Kennewick;Vancouver
US|West Virginia|America/New_York|Charleston;Huntington;Morgantown;Parkersburg;Wheeling;Martinsburg;Beckley
US|Wisconsin|America/Chicago|Milwaukee;Madison;Green Bay;Kenosha;Racine;Appleton;Eau Claire;Wausau;Oshkosh
US|Wyoming|America/Denver|Cheyenne;Casper;Laramie;Gillette;Rock Springs;Sheridan;Jackson
US|District of Columbia|America/New_York|Washington DC
IN|Andhra Pradesh|Asia/Kolkata|Visakhapatnam;Vijayawada;Guntur;Tirupati;Nellore;Kurnool;Kakinada;Rajahmundry;Anantapur
IN|Arunachal Pradesh|Asia/Kolkata|Itanagar;Naharlagun;Pasighat;Tawang;Bomdila
IN|Assam|Asia/Kolkata|Guwahati;Dibrugarh;Silchar;Jorhat;Tezpur;Nagaon;Tinsukia
IN|Bihar|Asia/Kolkata|Patna;Gaya;Muzaffarpur;Bhagalpur;Darbhanga;Purnia;Bihar Sharif
IN|Chhattisgarh|Asia/Kolkata|Raipur;Bilaspur;Durg;Bhilai;Korba;Rajnandgaon;Jagdalpur
IN|Goa|Asia/Kolkata|Panaji;Margao;Vasco da Gama;Mapusa;Ponda
IN|Gujarat|Asia/Kolkata|Ahmedabad;Surat;Vadodara;Rajkot;Gandhinagar;Jamnagar;Bhavnagar;Junagadh;Anand;Bharuch
IN|Haryana|Asia/Kolkata|Gurugram;Faridabad;Panipat;Ambala;Karnal;Hisar;Rohtak;Sonipat;Panchkula
IN|Himachal Pradesh|Asia/Kolkata|Shimla;Dharamshala;Solan;Mandi;Kullu;Hamirpur;Bilaspur
IN|Jharkhand|Asia/Kolkata|Ranchi;Jamshedpur;Dhanbad;Bokaro;Deoghar;Hazaribagh
IN|Karnataka|Asia/Kolkata|Bengaluru;Mysuru;Mangaluru;Hubballi;Dharwad;Belagavi;Shivamogga;Davanagere;Tumakuru;Udupi;Kalaburagi;Ballari;Bidar
IN|Kerala|Asia/Kolkata|Thiruvananthapuram;Kochi;Kozhikode;Thrissur;Kollam;Kannur;Alappuzha;Palakkad;Kottayam
IN|Madhya Pradesh|Asia/Kolkata|Bhopal;Indore;Gwalior;Jabalpur;Ujjain;Sagar;Rewa;Satna;Dewas
IN|Maharashtra|Asia/Kolkata|Mumbai;Pune;Nagpur;Nashik;Thane;Navi Mumbai;Aurangabad;Chhatrapati Sambhajinagar;Solapur;Kolhapur;Amravati;Jalgaon
IN|Manipur|Asia/Kolkata|Imphal;Thoubal;Kakching;Churachandpur
IN|Meghalaya|Asia/Kolkata|Shillong;Tura;Jowai;Nongpoh
IN|Mizoram|Asia/Kolkata|Aizawl;Lunglei;Champhai;Serchhip
IN|Nagaland|Asia/Kolkata|Kohima;Dimapur;Mokokchung;Wokha
IN|Odisha|Asia/Kolkata|Bhubaneswar;Cuttack;Puri;Rourkela;Sambalpur;Berhampur;Balasore
IN|Punjab|Asia/Kolkata|Ludhiana;Amritsar;Jalandhar;Patiala;Bathinda;Mohali;Pathankot;Hoshiarpur
IN|Rajasthan|Asia/Kolkata|Jaipur;Jodhpur;Udaipur;Kota;Ajmer;Bikaner;Alwar;Bharatpur;Sikar;Pali
IN|Sikkim|Asia/Kolkata|Gangtok;Namchi;Gyalshing;Mangan
IN|Tamil Nadu|Asia/Kolkata|Chennai;Coimbatore;Madurai;Tiruchirappalli;Salem;Tirunelveli;Erode;Vellore;Thanjavur;Tiruppur;Hosur;Dindigul
IN|Telangana|Asia/Kolkata|Hyderabad;Warangal;Nizamabad;Karimnagar;Khammam;Ramagundam;Siddipet
IN|Tripura|Asia/Kolkata|Agartala;Udaipur;Dharmanagar;Kailasahar
IN|Uttar Pradesh|Asia/Kolkata|Lucknow;Kanpur;Varanasi;Prayagraj;Agra;Noida;Ghaziabad;Meerut;Gorakhpur;Ayodhya;Mathura;Aligarh;Jhansi;Bareilly;Moradabad;Saharanpur
IN|Uttarakhand|Asia/Kolkata|Dehradun;Haridwar;Haldwani;Roorkee;Rishikesh;Nainital;Rudrapur
IN|West Bengal|Asia/Kolkata|Kolkata;Howrah;Durgapur;Asansol;Siliguri;Kharagpur;Bardhaman;Haldia;Darjeeling
IN|Andaman and Nicobar Islands|Asia/Kolkata|Sri Vijaya Puram;Diglipur
IN|Chandigarh|Asia/Kolkata|Chandigarh
IN|Dadra and Nagar Haveli and Daman and Diu|Asia/Kolkata|Silvassa;Daman;Diu
IN|Delhi|Asia/Kolkata|New Delhi;Delhi;Dwarka;Rohini
IN|Jammu and Kashmir|Asia/Kolkata|Srinagar;Jammu;Anantnag;Baramulla;Udhampur
IN|Ladakh|Asia/Kolkata|Leh;Kargil
IN|Lakshadweep|Asia/Kolkata|Kavaratti;Agatti;Minicoy
IN|Puducherry|Asia/Kolkata|Puducherry;Karaikal;Mahe;Yanam
NG|Abia|Africa/Lagos|Aba;Umuahia;Ohafia
NG|Adamawa|Africa/Lagos|Yola;Mubi;Numan
NG|Akwa Ibom|Africa/Lagos|Uyo;Eket;Ikot Ekpene
NG|Anambra|Africa/Lagos|Onitsha;Awka;Nnewi
NG|Bauchi|Africa/Lagos|Bauchi;Azare;Misau
NG|Bayelsa|Africa/Lagos|Yenagoa;Ogbia
NG|Benue|Africa/Lagos|Makurdi;Gboko;Otukpo
NG|Borno|Africa/Lagos|Maiduguri;Biu;Bama
NG|Cross River|Africa/Lagos|Calabar;Ikom;Ogoja
NG|Delta|Africa/Lagos|Warri;Asaba;Sapele;Ughelli;Agbor
NG|Ebonyi|Africa/Lagos|Abakaliki;Afikpo
NG|Edo|Africa/Lagos|Benin City;Auchi;Ekpoma
NG|Ekiti|Africa/Lagos|Ado Ekiti;Ikere Ekiti
NG|Enugu|Africa/Lagos|Enugu;Nsukka;Oji River
NG|Gombe|Africa/Lagos|Gombe;Kaltungo
NG|Imo|Africa/Lagos|Owerri;Orlu;Okigwe
NG|Jigawa|Africa/Lagos|Dutse;Hadejia;Gumel
NG|Kaduna|Africa/Lagos|Kaduna;Zaria;Kafanchan
NG|Kano|Africa/Lagos|Kano;Wudil;Bichi
NG|Katsina|Africa/Lagos|Katsina;Daura;Funtua
NG|Kebbi|Africa/Lagos|Birnin Kebbi;Argungu;Yauri
NG|Kogi|Africa/Lagos|Lokoja;Okene;Idah
NG|Kwara|Africa/Lagos|Ilorin;Offa;Omu-Aran
NG|Lagos|Africa/Lagos|Lagos;Ikeja;Lekki;Epe;Badagry;Ikorodu;Surulere;Yaba
NG|Nasarawa|Africa/Lagos|Lafia;Keffi;Akwanga
NG|Niger|Africa/Lagos|Minna;Bida;Suleja;Kontagora
NG|Ogun|Africa/Lagos|Abeokuta;Ijebu Ode;Sagamu;Ota;Ilaro
NG|Ondo|Africa/Lagos|Akure;Ondo;Owo;Ikare Akoko
NG|Osun|Africa/Lagos|Osogbo;Ile Ife;Ilesa;Ede
NG|Oyo|Africa/Lagos|Ibadan;Ogbomoso;Oyo;Iseyin
NG|Plateau|Africa/Lagos|Jos;Bukuru;Pankshin
NG|Rivers|Africa/Lagos|Port Harcourt;Obio-Akpor;Bonny;Bori
NG|Sokoto|Africa/Lagos|Sokoto;Tambuwal
NG|Taraba|Africa/Lagos|Jalingo;Wukari;Bali
NG|Yobe|Africa/Lagos|Damaturu;Potiskum;Gashua;Nguru
NG|Zamfara|Africa/Lagos|Gusau;Kaura Namoda;Talata Mafara
NG|Federal Capital Territory|Africa/Lagos|Abuja;Gwagwalada;Kubwa;Bwari
CA|Ontario|America/Toronto|Toronto;Ottawa;Mississauga;Brampton;Hamilton;London;Kitchener;Waterloo;Kingston;Windsor
CA|Quebec|America/Toronto|Montreal;Quebec City;Laval;Gatineau;Sherbrooke;Trois-Rivières
CA|British Columbia|America/Vancouver|Vancouver;Victoria;Surrey;Burnaby;Richmond;Kelowna;Nanaimo;Kamloops
CA|Alberta|America/Edmonton|Calgary;Edmonton;Red Deer;Lethbridge;Medicine Hat;Fort McMurray
CA|Manitoba|America/Winnipeg|Winnipeg;Brandon;Steinbach;Thompson
CA|Saskatchewan|America/Regina|Saskatoon;Regina;Moose Jaw;Prince Albert;Yorkton
CA|Nova Scotia|America/Halifax|Halifax;Dartmouth;Sydney;Truro
CA|New Brunswick|America/Moncton|Moncton;Fredericton;Saint John;Miramichi
CA|Newfoundland and Labrador|America/St_Johns|St John's;Mount Pearl;Corner Brook
CA|Newfoundland and Labrador|America/Goose_Bay|Happy Valley-Goose Bay;Labrador City
CA|Prince Edward Island|America/Halifax|Charlottetown;Summerside
CA|Yukon|America/Whitehorse|Whitehorse;Dawson City
CA|Northwest Territories|America/Yellowknife|Yellowknife;Inuvik;Hay River
CA|Nunavut|America/Iqaluit|Iqaluit;Rankin Inlet
AU|New South Wales|Australia/Sydney|Sydney;Newcastle;Wollongong;Central Coast;Wagga Wagga;Albury
AU|Victoria|Australia/Melbourne|Melbourne;Geelong;Ballarat;Bendigo;Shepparton
AU|Queensland|Australia/Brisbane|Brisbane;Gold Coast;Sunshine Coast;Townsville;Cairns;Toowoomba;Mackay
AU|Western Australia|Australia/Perth|Perth;Fremantle;Bunbury;Geraldton;Albany;Kalgoorlie
AU|South Australia|Australia/Adelaide|Adelaide;Mount Gambier;Whyalla;Port Augusta
AU|Tasmania|Australia/Hobart|Hobart;Launceston;Devonport;Burnie
AU|Northern Territory|Australia/Darwin|Darwin;Alice Springs;Katherine
AU|Australian Capital Territory|Australia/Sydney|Canberra`.trim().split(String.fromCharCode(10)).flatMap(row=>{const [country,region,zone,names]=row.split('|');return names.split(';').map(name=>({name,region,country,zone,countryName:({US:'United States',IN:'India',NG:'Nigeria',CA:'Canada',AU:'Australia'})[country]||country,keywords:`${region} ${country} ${name}`,group:'Major city'}))}));
