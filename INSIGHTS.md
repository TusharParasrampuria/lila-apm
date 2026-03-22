# Insights

## 1. Ambrose Valley is carrying most of the game's day-to-day activity

The first thing that stands out in the tool is how dominant Ambrose Valley is compared with the other two maps. Out of 796 total matches in the processed data, 566 happen on Ambrose Valley, which is roughly 71% of the sample. It is not only the most-played map, but also the most loot-active one, averaging 17.59 loot events per match. The strongest signal is that the ten loot-heaviest matches in the dataset all belong to Ambrose Valley.

That combination suggests this map is doing most of the work for the live experience: it is where players are spending time, where they are interacting with the item economy, and where route familiarity is most likely forming. For a level designer, that makes Ambrose Valley the highest-leverage place to investigate pacing, readability of POIs, and whether a few high-value lanes are attracting too much traffic. If those lanes are overperforming, the likely downstream effect is less route diversity, more repetitive openings, and weaker long-term match variety.

## 2. Storm pressure looks disproportionately punishing on the smaller maps

The storm pattern is much harsher on Lockdown and Grand Rift than it is on Ambrose Valley once you normalize by match count. Ambrose Valley records about 3 storm deaths per 100 matches, while Grand Rift jumps to 8.47 and Lockdown rises to 9.94. The raw numbers reinforce the same story: Lockdown logs 17 storm deaths, which is the same count as Ambrose Valley, despite having only 171 matches compared with Ambrose Valley's 566.

That points to more than just isolated player mistakes. It suggests that storm timing, pathing friction, extract placement, or chokepoint structure may be squeezing players too hard on the smaller maps. A level designer should care because storm deaths often reveal where the map is failing to support clean rotations. If this is addressed well, the likely gains are better extraction success, healthier late-match pacing, and lower frustration during endgame movement. The most practical next step would be to inspect repeated storm-death zones in the replay tool and compare them against route options, cover density, and final safe-area transitions.

## 3. Lockdown feels busy, but it is not converting that pressure into kills

Lockdown has the highest average event density in the dataset at 124.2 events per match, compared with 116.15 on Grand Rift and 107.8 on Ambrose Valley. It also has the highest position-event share at 87.5%, which means the map is generating a lot of movement and spatial churn. Even with that higher activity level, it does not produce the highest combat payoff. Kills per match are 2.49 on Lockdown, below both Grand Rift at 3.27 and Ambrose Valley at 3.18.

In other words, Lockdown appears to create pressure without delivering the same level of combat resolution. That can mean players are constantly rotating, probing, and repositioning, but not actually finding or finishing satisfying encounters. For a level designer, that is worth attention because a map can feel intense while still underperforming on combat quality. If the layout is encouraging over-rotation, too many near-misses, or storm-disrupted skirmishes, the result is a match that feels noisy but not rewarding. The metrics most likely to move here are time-to-engagement, combat conversion rate, and overall encounter satisfaction. A good follow-up would be to inspect whether cover clusters, sightline breaks, or route separation are causing players to circulate around each other rather than collide decisively.

## 4. Grand Rift appears to convert less looting into more combat

Grand Rift is the smallest slice of the dataset by volume, but its per-match behavior is interesting. It averages 3.27 kills per match, slightly ahead of Ambrose Valley's 3.18, while also averaging only 14.92 loot events per match compared with Ambrose Valley's 17.59. Another way to see the same pattern is the kill-to-loot ratio: Grand Rift sits at 0.219, higher than both Lockdown at 0.208 and Ambrose Valley at 0.181.

That makes Grand Rift look comparatively efficient at turning map time into combat outcomes. Players appear to spend a little less time vacuuming up loot and a little more time resolving encounters. A level designer should care because this can indicate a healthier balance between exploration and conflict, especially if the goal is to keep matches tense without letting them drift into overlong loot routes. The practical design question is whether Grand Rift has a stronger encounter rhythm because of route convergence, better sightline tension, or simply less dead travel. If that pattern holds, there may be lessons worth borrowing for the other maps, particularly around how quickly players are funneled from spawn movement into meaningful pressure.

## 5. Match pacing shifts noticeably across the five-day sample

Looking at the dataset by day, February 10 starts hot and February 12 cools off. Kills per match drop from 3.53 on February 10 to 2.22 on February 12, while loot per match also slides from 17.26 to 15.01. Then February 13 stands out for a different reason: storm deaths jump sharply to 8.93 per 100 matches, the highest day-level storm rate in the sample. February 14 rebounds in kills and loot, but it is also a partial day, so it is better treated as directional than definitive.

This matters because it suggests the tool is not just useful for map comparisons; it can also surface pacing changes over time. For a level designer or live-ops partner, that opens the door to separating persistent map issues from day-specific conditions such as tuning changes, matchmaking shifts, or unusual play patterns. If a future patch changes storm timing, loot density, or route incentives, this same view can be used to watch whether kills per match, loot per match, and storm-death rate move together or diverge. That makes the visualization useful not only as a forensic map tool, but also as a lightweight balancing dashboard for short time windows.
