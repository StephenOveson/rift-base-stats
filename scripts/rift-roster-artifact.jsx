import { useState, useEffect, useMemo } from "react";

/* Stats are embedded rather than fetched: the artifact sandbox blocks outbound
   requests, so a live Data Dragon call fails here. The patch and roster size
   are whatever the build baked in — don't restate them here, or a rebuild
   silently ships a stale claim. Order per row:
   name, hp, hp+, hp5, hp5+, ad, ad+, as, as+%, ar, ar+, mr, mr+, ms */
const D = [["Aatrox",650,114,3,0.5,60,5,0.651,2.5,38,4.8,32,2.05,345],["Ahri",590,104,2.5,0.6,53,3,0.668,2.2,21,4.2,30,1.3,330],["Akali",600,119,9,0.9,62,3.299999952316284,0.625,3.2,23,4.7,37,2.05,345],["Akshan",610,107,3.75,0.65,52,3,0.638,4,26,4.7,33,1.1,330],["Alistar",685,120,8.5,0.85,62,3.75,0.625,2.125,40,4.7,32,2.05,335],["Ambessa",630,110,8.5,0.75,63,3,0.625,2.5,35,4.9,32,2.05,335],["Amumu",685,94,9,0.85,57,3.799999952316284,0.736,2.18,33,4,32,2.05,335],["Anivia",550,92,5.5,0.55,51,3.200000047683716,0.658,1.68,19,4.1,30,1.3,325],["Annie",560,96,5.5,0.55,50,2.6500000953674316,0.61,1.36,23,4,30,1.3,335],["Aphelios",600,102,3.25,0.55,55,2.299999952316284,0.665,2.1,26,4.2,33,1.1,325],["Ashe",610,101,3.5,0.55,59,3.5,0.658,3,26,4.6,33,1.1,325],["Aurelion Sol",600,90,5.5,0.55,58,3.200000047683716,0.625,1.5,22,4,30,1.3,340],["Aurora",607,110,6,0.55,53,3,0.668,2,23,4.5,32,1.3,335],["Azir",575,108,7,0.75,56,3.5,0.625,5,25,5,30,1.3,330],["Bard",630,103,5.5,0.55,52,3,0.658,2,34,5,30,1.3,335],["Bel'Veth",580,105,6,0.6,55,1.5,0.67,0,28,5,32,2.05,340],["Blitzcrank",600,109,7.5,0.75,62,3.5,0.625,1.13,37,4.7,32,2.05,325],["Brand",570,105,5.5,0.55,57,3,0.681,2,24,4.2,30,1.3,340],["Braum",610,112,8.5,1,55,3.200000047683716,0.644,3.5,35,5,32,2.05,335],["Briar",625,95,0,0,60,2.5,0.644,2,30,4.5,32,2.05,340],["Caitlyn",580,107,3.5,0.55,62,3.799999952316284,0.681,4,27,4.7,33,1.1,325],["Camille",650,99,8.5,0.8,68,3.799999952316284,0.644,2.5,35,4.5,32,2.05,340],["Cassiopeia",630,98,5.5,0.5,53,3,0.647,1.5,18,4.7,32,1.3,335],["Cho'Gath",644,94,9,0.85,69,4.199999809265137,0.658,1.44,38,4.5,32,2.05,345],["Corki",610,100,5.5,0.55,52,2.5,0.644,2.8,27,4.5,33,1.1,325],["Darius",652,114,10,0.95,64,5,0.625,1,37,5.2,32,2.05,340],["Diana",640,109,6.5,0.85,57,3,0.625,2,31,4.3,32,2.05,345],["Dr. Mundo",640,103,7,0.5,61,2.5,0.67,3.3,32,4.5,29,2.3,345],["Draven",675,104,3.75,0.7,62,3.4000000953674316,0.679,2.7,29,4.5,33,1.1,330],["Ekko",655,99,9,0.9,58,3,0.688,3.3,32,4.2,32,2.05,340],["Elise",620,109,5.5,0.6,55,3,0.625,1.75,30,4.5,30,1.3,330],["Evelynn",642,98,8.5,0.75,61,3,0.667,2.1,37,4.7,32,2.05,335],["Ezreal",600,102,4,0.65,60,3.75,0.625,2.5,24,4.2,33,1.1,325],["Fiddlesticks",650,106,5.5,0.6,55,2.6500000953674316,0.625,2.11,34,4.7,30,1.3,335],["Fiora",620,99,8.5,0.55,66,3.299999952316284,0.69,3.2,33,4.7,32,2.05,345],["Fizz",640,106,8,0.7,58,3,0.658,3.1,26,4.6,32,2.05,335],["Galio",600,126,8,0.8,59,3.5,0.625,1.5,24,4.7,32,2.05,340],["Gangplank",630,114,6,0.6,64,4.199999809265137,0.658,3.2,31,4.7,32,2.05,345],["Garen",690,98,8,0.5,69,4.5,0.625,3.65,38,4.2,32,1.55,340],["Gnar",540,79,4.5,1.25,60,3.200000047683716,0.625,6,32,3.7,30,1.3,335],["Gragas",640,115,5.5,0.5,64,3.5,0.675,2.05,38,5,32,2.05,330],["Graves",625,106,8,0.7,66,4,0.475,3,33,4.6,33,1.1,340],["Gwen",620,115,9,0.9,63,3,0.69,2.25,39,4.9,32,2.05,340],["Hecarim",625,106,7,0.75,66,3.700000047683716,0.67,2.5,32,5.45,32,2.05,345],["Heimerdinger",558,105,7,0.55,56,2.700000047683716,0.658,1.36,19,4.2,30,1.3,340],["Hwei",580,109,5.5,0.55,54,3.299999952316284,0.69,2.5,21,4.7,30,1.3,330],["Illaoi",656,115,9.5,0.8,65,5,0.625,2.5,35,5,32,2.05,350],["Irelia",630,115,3.5,0.85,65,3.5,0.656,2.5,36,4.7,30,2.05,335],["Ivern",630,99,7,0.85,50,3,0.644,3.4,27,4.7,30,1.3,330],["Janna",570,90,5.5,0.55,47,2.5,0.625,3,28,4.5,30,1.3,325],["Jarvan IV",640,104,8,0.7,64,3,0.658,2.5,36,4.6,32,2.05,340],["Jax",650,103,8.5,0.55,68,4.25,0.638,3.4,36,4.2,32,2.05,350],["Jayce",590,109,6,0.6,59,4.25,0.658,3,22,5,30,1.3,335],["Jhin",655,107,3.75,0.55,61,4.400000095367432,0.625,0,24,4.7,33,1.1,330],["Jinx",630,105,3.75,0.5,59,3.25,0.625,1,26,4.2,33,1.1,325],["K'Sante",625,120,9.5,1,64,3.5,0.688,2.5,36,5.2,30,2.1,330],["Kai'Sa",640,102,4,0.55,59,2.5999999046325684,0.644,1.8,25,4.2,33,1.1,335],["Kalista",560,114,4,0.75,57,4.75,0.694,4.5,24,5.2,33,1.1,330],["Karma",630,109,5.5,0.55,49,3,0.625,2.3,28,5,30,1.3,335],["Karthus",620,110,6.5,0.55,46,3.25,0.625,2.11,21,4.7,30,1.3,335],["Kassadin",646,113,6,0.5,59,3.9000000953674316,0.64,3.7,21,4,30,1.3,335],["Katarina",672,108,7.5,0.7,58,3.200000047683716,0.658,2.74,32,4.7,32,2.05,335],["Kayle",670,92,5,0.5,50,2.5,0.625,1.5,26,4.2,22,1.3,335],["Kayn",655,103,8,0.75,68,3.299999952316284,0.669,2.7,38,4.5,32,2.05,340],["Kennen",580,98,5.5,0.65,48,3.75,0.625,3.4,29,4.95,30,1.3,335],["Kha'Zix",643,99,7.5,0.75,60,3.0999999046325684,0.668,2.7,32,4.2,32,2.05,345],["Kindred",595,104,7,0.55,65,3.25,0.625,3.5,29,4.7,33,1.1,325],["Kled",410,84,6,0.75,65,3.5,0.625,3.5,35,5.2,28,2.05,345],["Kog'Maw",635,99,3.75,0.55,61,3.0999999046325684,0.665,2.65,24,4.45,33,1.1,330],["LeBlanc",598,108,7.5,0.55,55,2.200000047683716,0.658,1.5,22,4.2,30,1.3,340],["Lee Sin",645,108,7.5,0.7,66,3.4000000953674316,0.651,3,36,4.5,32,2.05,345],["Leona",646,101,8.5,0.85,60,3,0.625,2.9,43,4.8,32,2.05,335],["Lillia",605,105,2.5,0.55,61,3.0999999046325684,0.625,2.7,22,4.5,32,1.55,330],["Lissandra",620,110,7,0.55,55,2.700000047683716,0.656,1.5,22,4.2,30,1.3,325],["Locke",620,109,9,0.9,58,3,0.688,3.3,32,4.2,32,2.05,340],["Lucian",641,100,3.75,0.65,60,2.5,0.638,2.5,28,4.2,33,1.1,335],["Lulu",565,92,6,0.6,47,2.5999999046325684,0.625,2.25,26,4.6,30,1.3,330],["Lux",580,99,5.5,0.55,54,3.299999952316284,0.669,3,21,5.2,30,1.3,330],["Malphite",665,104,7,0.55,62,4,0.736,3.4,40,4.95,28,2.05,335],["Malzahar",580,101,6,0.6,55,3,0.625,1.5,18,4.7,30,1.3,335],["Maokai",665,109,5,0.75,64,3.299999952316284,0.8,2.125,35,5.2,32,2.05,335],["Master Yi",640,105,7.5,0.65,65,2.5,0.679,2.5,33,4.5,32,2.05,355],["Mel",630,99,6,0.55,54,3.299999952316284,0.625,2.5,21,5.2,30,1.3,330],["Milio",560,88,5,0.5,48,3.200000047683716,0.625,3,26,4.6,30,1.3,330],["Miss Fortune",625,100,3.75,0.65,55,2.4000000953674316,0.656,3,25,4,33,1.1,325],["Mordekaiser",645,104,5,0.75,61,4,0.625,1,37,4.2,32,2.05,335],["Morgana",630,104,5.5,0.4,56,3.5,0.625,1.53,25,4.2,30,1.3,335],["Naafiri",610,105,6.25,0.6,55,2,0.663,2.1,28,4.2,32,2.05,340],["Nami",560,88,5.5,0.55,54,3.0999999046325684,0.644,2.61,29,5.2,30,1.3,335],["Nasus",650,104,9,0.9,67,4,0.638,3.48,34,4.7,32,2.05,350],["Nautilus",646,100,8.5,0.55,61,3.299999952316284,0.706,1,39,4.95,32,2.05,325],["Neeko",610,104,7.5,0.75,48,2.5,0.625,3.5,21,5.2,30,1.3,340],["Nidalee",610,109,6,0.6,58,3.5,0.638,3.22,32,5,30,1.45,335],["Nilah",570,101,6,0.9,58,2,0.697,1.25,27,4.2,32,2.05,340],["Nocturne",640,109,7,0.75,62,2.5999999046325684,0.721,2.7,36,4.2,32,1.55,345],["Nunu & Willump",610,90,5,0.8,61,3,0.625,2.25,29,4.2,32,2.05,345],["Olaf",645,119,6.5,0.6,68,4.699999809265137,0.72,2.7,35,4.2,32,2.05,350],["Orianna",565,110,7,0.55,44,2.5999999046325684,0.658,3.5,20,4.2,26,1.3,325],["Ornn",660,109,9,0.9,69,3.5,0.625,2,33,5.2,32,2.05,335],["Pantheon",650,109,6,0.65,64,3.299999952316284,0.658,2.95,40,4.95,28,2.05,345],["Poppy",610,110,9,0.8,56,4,0.658,2.5,35,5,32,2.05,345],["Pyke",670,110,7,0.5,62,2,0.667,2.5,37,4.7,32,2.05,330],["Qiyana",590,115,8,0.9,64,3.0999999046325684,0.688,2.1,31,4.5,32,2.05,335],["Quinn",565,107,5.5,0.55,59,3.200000047683716,0.668,3.1,28,4.7,33,1.1,330],["Rakan",610,99,5,0.5,62,3.5,0.635,3,30,4.9,32,2.05,335],["Rammus",645,100,8,0.55,65,2.75,0.7,2.215,35,4.5,32,2.05,335],["Rek'Sai",600,99,2.5,0.5,62,3,0.667,2,35,4.5,32,2.05,340],["Rell",620,104,7.5,0.85,55,3,0.625,2,30,4,28,1.8,315],["Renata Glasc",545,94,5.5,0.55,49,3,0.625,2.11,27,4.7,30,1.3,330],["Renekton",660,111,8,0.75,69,4.150000095367432,0.665,2.75,35,5.2,28,2.05,345],["Rengar",590,104,6,0.5,68,3,0.667,3,34,4.2,32,2.05,345],["Riven",630,100,8.5,0.5,64,3,0.625,3.5,33,4.4,32,2.05,340],["Rumble",640,105,7,0.6,64,3.200000047683716,0.644,1.85,36,4.7,28,1.55,345],["Ryze",620,124,8,0.8,55,3,0.658,2.11,22,4.2,32,1.3,340],["Samira",630,108,3.25,0.55,57,3,0.658,3.3,26,4.7,33,1.1,335],["Sejuani",630,114,8.5,1,66,4,0.688,3.5,34,5.45,32,2.05,340],["Senna",530,89,3.5,0.55,50,0,0.625,2.6,25,4,33,1.1,330],["Seraphine",570,95,6.5,0.6,50,3,0.669,2,26,4.2,30,1.3,330],["Sett",670,114,7,0.5,60,4,0.625,1.75,33,4.7,28,2.05,340],["Shaco",630,99,8.5,0.55,63,3,0.694,3,30,4,32,2.05,345],["Shen",610,99,8.5,0.75,64,3,0.751,3,34,4.2,32,2.05,340],["Shyvana",625,95,7,0.65,62,4,0.638,2,35,4,32,2.05,350],["Singed",650,96,9.5,0.55,63,3.4000000953674316,0.7,1.9,34,4.2,32,2.05,345],["Sion",655,87,9,0.8,68,4,0.679,1.3,36,4.2,32,2.05,345],["Sivir",600,104,3.25,0.55,60,2.5,0.625,1.6,30,4,33,1.1,335],["Skarner",630,110,7.5,0.75,63,5,0.625,2,33,4.5,32,2.05,335],["Smolder",575,100,3.75,0.6,58,2.299999952316284,0.638,4,24,4,33,1.1,330],["Sona",550,91,5.5,0.55,49,3,0.644,2.3,26,4.2,30,1.3,325],["Soraka",605,88,2.5,0.5,50,3,0.625,2.14,32,5,30,1.3,325],["Swain",595,99,3,0.5,58,2.700000047683716,0.625,2.11,25,4.7,31,1.55,330],["Sylas",600,122,9,0.9,61,3,0.645,3.5,29,5.2,32,2.55,340],["Syndra",583,100,6.5,0.6,54,2.9000000953674316,0.658,2,25,4,30,1.3,330],["Tahm Kench",640,103,6.5,0.55,56,3.200000047683716,0.658,2.5,39,4.7,32,2.05,335],["Taliyah",550,104,6.5,0.65,58,3.299999952316284,0.658,1.36,18,4.7,28,1.3,330],["Talon",658,109,8.5,0.75,68,3.0999999046325684,0.625,2.9,30,4.7,36,2.05,335],["Taric",645,99,6,0.5,55,3.5,0.625,2,40,4.3,28,2.05,340],["Teemo",615,104,5.5,0.65,54,3,0.69,3.38,24,4.5,30,1.3,330],["Thresh",620,120,7,0.55,56,2.200000047683716,0.625,3.5,33,0,30,1.55,330],["Tristana",640,102,4,0.5,60,3.4000000953674316,0.656,1.5,30,4,33,1.1,325],["Trundle",650,110,6,0.75,68,4.5,0.67,2.9,37,4.5,32,2.05,350],["Tryndamere",696,108,8.5,0.9,66,4.5,0.67,3.4,33,4.8,32,2.05,345],["Twisted Fate",604,108,5.5,0.6,52,2.5,0.625,2.5,24,4.35,30,1.3,330],["Twitch",630,98,3.75,0.6,59,3,0.679,3,27,4,33,1.1,330],["Udyr",664,92,6,0.75,62,4,0.65,3,31,4.7,32,2.05,350],["Urgot",655,102,7.5,0.7,63,4,0.625,3.75,36,5,32,2.05,330],["Varus",600,105,3.5,0.55,59,3.4000000953674316,0.658,3.5,24,4,33,1.1,330],["Vayne",580,98,4,0.5,60,2.3499999046325684,0.658,2.8,23,4.6,33,1.1,330],["Veigar",580,108,6.5,0.6,52,2.700000047683716,0.625,2.24,18,5.2,32,1.3,340],["Vel'Koz",590,102,5.5,0.55,55,3.1415927410125732,0.643,1.59,22,4.7,30,1.3,340],["Vex",590,104,6.5,0.6,54,2.75,0.669,1,23,4.45,28,1.3,335],["Vi",655,105,10,1,63,3.5,0.644,2,30,4.7,32,2.05,340],["Viego",630,109,7,0.7,57,3.5,0.658,2.75,34,4.6,32,2.05,345],["Viktor",600,100,8,0.65,53,3,0.658,2.11,23,4.4,30,1.3,335],["Vladimir",600,110,7,0.6,55,3,0.658,2,24,4.5,30,1.3,330],["Volibear",650,104,9,0.75,65,3.5,0.625,2,35,5.2,32,2.05,340],["Warwick",620,99,4,0.75,65,2.5,0.638,2,33,4.4,32,2.05,335],["Wukong",610,99,3.5,0.65,66,3.5,0.69,3,31,4.7,28,2.05,340],["Xayah",630,107,3.25,0.75,60,3.5,0.658,3.9,25,4.2,33,1.1,330],["Xerath",575,106,5.5,0.55,55,3,0.658,1.36,22,4.7,30,1.3,340],["Xin Zhao",620,106,8,0.7,63,3,0.645,3.5,35,4.4,32,2.05,345],["Yasuo",590,110,6.5,0.9,60,2.5,0.697,3.5,32,4.6,32,2.05,345],["Yone",620,105,7.5,0.75,62,2,0.625,3.5,33,4.6,32,2.05,345],["Yorick",650,114,8,0.8,62,5,0.625,2,36,4.5,32,2.05,340],["Yunara",590,110,4,0.55,55,3,0.65,2,25,4.4,33,1.1,325],["Yuumi",500,69,5,0.55,49,3.0999999046325684,0.625,1,25,4.2,25,1.1,330],["Zaahen",640,114,7.5,0.8,63,4,0.625,2.5,36,5,32,2.05,345],["Zac",685,109,5,0.5,60,3.4000000953674316,0.736,1.6,33,5.2,32,2.05,340],["Zed",654,99,7,0.65,63,3.4000000953674316,0.651,3.3,32,4.7,29,2.05,345],["Zeri",600,110,3.25,0.7,56,2,0.658,2,24,4.2,33,1.1,330],["Ziggs",606,106,6.5,0.6,55,3.0999999046325684,0.656,2,21,4.7,30,1.3,325],["Zilean",574,96,5.5,0.5,52,3,0.658,2.13,24,5,30,1.3,335],["Zoe",630,106,7.5,0.6,58,3.299999952316284,0.658,2.5,21,4.7,30,1.3,340],["Zyra",574,93,5.5,0.5,53,3.200000047683716,0.681,2.11,29,4.2,30,1.3,340]];
const PATCH = "16.17.1";
const AD_SOURCE = "CommunityDragon 16.17";
/* Champions whose AD growth the build could not resolve. A stat of 0 is not
   evidence of that — some champions really have no AD growth — so the caveat
   keys on this list rather than on counting zeros. */
const AD_MISSING = [];

const curve = (l) => (l - 1) * (0.7025 + 0.0175 * (l - 1));

const STATS = [
  { k:"hp",  label:"Health",        short:"HP",  dp:0, f:(c,m)=>c[1]+c[2]*m },
  { k:"hp5", label:"Health regen",  short:"HP5", dp:2, f:(c,m)=>c[3]+c[4]*m },
  { k:"ad",  label:"Attack damage", short:"AD",  dp:1, f:(c,m)=>c[5]+c[6]*m },
  { k:"as",  label:"Attack speed",  short:"AS",  dp:3, f:(c,m)=>c[7]*(1+(c[8]/100)*m) },
  { k:"ar",  label:"Armor",         short:"AR",  dp:1, f:(c,m)=>c[9]+c[10]*m },
  { k:"mr",  label:"Magic resist",  short:"MR",  dp:1, f:(c,m)=>c[11]+c[12]*m },
  { k:"ms",  label:"Move speed",    short:"MS",  dp:0, f:(c)=>c[13] },
];

const VOID="#070a0f", PLATE="#0e141c", RAISE="#141c26";
const GOLD="#c89b3c", LIT="#e4c37b", TEAL="#0ac8b9";
const INK="#dfe6ee", MUTE="#7e8a99", FAINT="#54606e";
const DISP="'Orbitron',ui-sans-serif,system-ui,sans-serif";
const BODY="'Rajdhani',ui-sans-serif,system-ui,sans-serif";

const mono = (n) => n.replace(/[^A-Za-z ]/g,"").split(" ")
  .filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();

export default function RiftRoster(){
  const [level,setLevel]=useState(18);
  const [sortKey,setSortKey]=useState("bst");
  const [query,setQuery]=useState("");
  const [open,setOpen]=useState(null);

  useEffect(()=>{
    const l=document.createElement("link");
    l.rel="stylesheet";
    l.href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Rajdhani:wght@400;500;600&display=swap";
    document.head.appendChild(l);
    return ()=>{ try{document.head.removeChild(l);}catch{} };
  },[]);

  const scored = useMemo(()=>{
    const m=curve(level);
    const rows=D.map(c=>{
      const v={}; for(const s of STATS) v[s.k]=s.f(c,m);
      return { name:c[0], v };
    });
    const b={};
    for(const s of STATS){ const a=rows.map(r=>r.v[s.k]); b[s.k]=[Math.min(...a),Math.max(...a)]; }
    for(const r of rows){
      r.norm={}; let sum=0;
      for(const s of STATS){
        const [lo,hi]=b[s.k];
        const n = hi===lo ? 50 : (r.v[s.k]-lo)/(hi-lo)*100;
        r.norm[s.k]=n; sum+=n;
      }
      r.bst=sum/STATS.length;
    }
    return rows;
  },[level]);

  const rows = useMemo(()=>{
    const t=query.trim().toLowerCase();
    return scored.filter(r=>!t||r.name.toLowerCase().includes(t))
      .sort((a,b)=> sortKey==="bst" ? b.bst-a.bst : b.v[sortKey]-a.v[sortKey]);
  },[scored,query,sortKey]);

  const def=STATS.find(s=>s.k===sortKey);
  const top=rows.length ? (sortKey==="bst"?rows[0].bst:rows[0].v[sortKey]) : 1;

  const chip=(on)=>({
    font:`600 11px ${BODY}`, letterSpacing:".11em", textTransform:"uppercase",
    padding:"5px 11px", borderRadius:2, cursor:"pointer",
    border:`1px solid ${on?"rgba(200,155,60,.55)":"rgba(255,255,255,.05)"}`,
    color:on?LIT:MUTE, background:on?"rgba(200,155,60,.09)":"transparent",
  });
  const kicker={fontFamily:DISP,fontSize:9,letterSpacing:".22em",
                textTransform:"uppercase",color:FAINT};

  return (
    <div style={{position:"relative",minHeight:"100vh",background:VOID,color:INK,fontFamily:BODY}}>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:3,
        background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.06) 2px,rgba(0,0,0,.06) 4px)"}}/>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:3,
        background:"radial-gradient(ellipse at center,transparent 35%,rgba(0,0,0,.7) 100%)"}}/>

      <div style={{position:"relative",zIndex:1,maxWidth:900,margin:"0 auto",padding:"26px 14px 70px"}}>
        <div style={{fontFamily:DISP,fontSize:9,letterSpacing:".34em",color:TEAL,textTransform:"uppercase"}}>
          Summoner&#39;s Rift &middot; base statistics
        </div>
        <h1 style={{fontFamily:DISP,fontWeight:700,fontSize:23,letterSpacing:".11em",
                    margin:"6px 0 0",color:LIT,textTransform:"uppercase"}}>Rift Roster</h1>
        <p style={{fontSize:13,color:MUTE,margin:"3px 0 0",letterSpacing:".05em"}}>
          Patch {PATCH} &middot; {D.length} champions
        </p>
        <div style={{height:1,margin:"14px 0 0",
                     background:"linear-gradient(90deg,#c89b3c,rgba(200,155,60,0) 70%)"}}/>

        <div style={{position:"sticky",top:0,zIndex:4,background:VOID,
                     padding:"14px 0 12px",borderBottom:"1px solid rgba(200,155,60,.18)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{...kicker,color:MUTE,width:46}}>Level</span>
            <input type="range" min="1" max="18" step="1" value={level}
                   onChange={e=>setLevel(+e.target.value)}
                   style={{flex:1,accentColor:GOLD,height:22}} aria-label="Champion level"/>
            <span style={{fontFamily:DISP,fontSize:17,color:LIT,width:30,textAlign:"right"}}>{level}</span>
          </div>
          <input value={query} onChange={e=>{setQuery(e.target.value);setOpen(null);}}
            placeholder="Find a champion" aria-label="Find a champion"
            style={{width:"100%",marginTop:10,background:PLATE,border:"1px solid rgba(255,255,255,.05)",
                    borderLeft:"2px solid rgba(200,155,60,.18)",color:INK,borderRadius:2,
                    padding:"9px 11px",font:`500 15px ${BODY}`}}/>
          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:10}}>
            {[{k:"bst",short:"Total"},...STATS].map(s=>(
              <button key={s.k} style={chip(sortKey===s.k)}
                onClick={()=>{setSortKey(s.k);setOpen(null);}}>{s.short}</button>
            ))}
          </div>
        </div>

        <p style={{...kicker,margin:"16px 0 6px"}}>
          {rows.length} shown &mdash; {sortKey==="bst"?"base stat total":def.label} at level {level}
        </p>

        <ol style={{listStyle:"none",margin:0,padding:0}}>
          {rows.map((r,i)=>{
            const cur = sortKey==="bst" ? r.bst : r.v[sortKey];
            const isOpen = open===r.name;
            return (
              <li key={r.name} style={{borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                <button onClick={()=>setOpen(isOpen?null:r.name)}
                  style={{display:"flex",alignItems:"center",gap:11,width:"100%",padding:"9px 4px",
                          background:"none",border:"none",color:"inherit",textAlign:"left",
                          cursor:"pointer",fontFamily:BODY}}>
                  <span style={{fontFamily:DISP,fontSize:10,color:FAINT,width:26,textAlign:"right"}}>
                    {String(i+1).padStart(2,"0")}
                  </span>
                  <span style={{width:36,height:36,flex:"0 0 auto",background:RAISE,
                    border:"1px solid rgba(255,255,255,.05)",display:"flex",alignItems:"center",
                    justifyContent:"center",fontFamily:DISP,fontSize:11,color:GOLD,
                    clipPath:"polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)"}}>
                    {mono(r.name)}
                  </span>
                  <span style={{flex:1,minWidth:0}}>
                    <span style={{display:"block",fontWeight:600,fontSize:16,whiteSpace:"nowrap",
                                  overflow:"hidden",textOverflow:"ellipsis"}}>{r.name}</span>
                    <span style={{display:"block",height:2,background:"rgba(255,255,255,.06)",marginTop:5}}>
                      <span style={{display:"block",height:"100%",width:`${Math.max(2,(cur/top)*100)}%`,
                        background:`linear-gradient(90deg,rgba(200,155,60,.45),${GOLD})`}}/>
                    </span>
                  </span>
                  <span style={{fontFamily:DISP,fontSize:10,color:FAINT,width:36,textAlign:"right"}}>
                    {r.bst.toFixed(1)}
                  </span>
                  <span style={{fontFamily:DISP,fontSize:15,color:LIT,width:70,textAlign:"right"}}>
                    {sortKey==="bst"?r.bst.toFixed(1):cur.toFixed(def.dp)}
                  </span>
                </button>

                {isOpen && (
                  <div style={{padding:"10px 4px 18px 74px",background:PLATE,
                               borderLeft:"2px solid rgba(200,155,60,.35)"}}>
                    {STATS.map(s=>(
                      <div key={s.k} style={{display:"flex",alignItems:"center",gap:9,margin:"6px 0"}}>
                        <span style={{width:104,font:`600 10px ${BODY}`,letterSpacing:".13em",
                                      textTransform:"uppercase",color:MUTE}}>{s.label}</span>
                        <span style={{width:58,textAlign:"right",fontFamily:DISP,fontSize:11}}>
                          {r.v[s.k].toFixed(s.dp)}
                        </span>
                        <span style={{flex:1,height:5,background:"rgba(255,255,255,.06)"}}>
                          <span style={{display:"block",height:"100%",width:`${r.norm[s.k]}%`,background:GOLD}}/>
                        </span>
                        <span style={{width:26,textAlign:"right",fontFamily:DISP,fontSize:10,color:FAINT}}>
                          {Math.round(r.norm[s.k])}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {rows.length===0 && <p style={{...kicker,marginTop:20}}>No match &mdash; clear the search.</p>}

        <footer style={{color:FAINT,fontSize:13,lineHeight:1.75,marginTop:28,
                        borderTop:"1px solid rgba(255,255,255,.05)",paddingTop:16}}>
          The dim number on each row is the base stat total: all seven stats min&ndash;max scaled
          0&ndash;100 across the roster at the current level, then averaged. It recomputes as the
          slider moves, so a champion with a high base and thin growth slides down as you climb.
          Level 18 is base + 17 &times; growth.<br/><br/>
          Stats are baked in rather than fetched, because this sandbox blocks outbound requests.
          That means no champion portraits, and the numbers are frozen at patch {PATCH} rather
          than tracking live &mdash; the standalone HTML version pulls the current roster from Riot.
          {AD_MISSING.length > 0 && (
            <>
              <br/><br/>
              <strong style={{color:LIT}}>Data caveat for patch {PATCH}:</strong> attack damage
              growth could not be recovered for{" "}
              {AD_MISSING.length === D.length ? `all ${D.length} champions` : AD_MISSING.join(", ")}
              , so AD for {AD_MISSING.length === D.length ? "every champion" : "those"} is base AD
              at every level. Every other stat here (HP, regen, armor, resist, attack speed, move
              speed) checks out normally.
            </>
          )}
          {AD_SOURCE && (
            <>
              <br/><br/>
              Riot&#39;s export reports no AD growth on this patch, so that one field is taken
              from {AD_SOURCE}&#39;s raw game files instead. The two sources agree on every
              other stat.
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
