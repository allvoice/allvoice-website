WITH RECURSIVE
creature_quest_relations AS (
    SELECT 'accept' as source, qr.quest, ct.entry as creature_id
    FROM creature_template ct
    JOIN creature_questrelation qr ON qr.id = ct.entry
        UNION ALL
    SELECT 'complete' as source, qr.quest, ct.entry as creature_id
    FROM creature_template ct
    JOIN creature_involvedrelation qr ON qr.id = ct.entry
        UNION ALL
    SELECT 'progress' as source, qr.quest, ct.entry as creature_id
    FROM creature_template ct
    JOIN creature_involvedrelation qr ON qr.id = ct.entry
),
gameobject_quest_relations AS (
    SELECT 'accept' as source, qr.quest, gt.entry as gameobject_id
    FROM gameobject_template gt
    JOIN gameobject_questrelation qr ON qr.id = gt.entry
        UNION ALL
    SELECT 'complete' as source, qr.quest, gt.entry as gameobject_id
    FROM gameobject_template gt
    JOIN gameobject_involvedrelation qr ON qr.id = gt.entry
        UNION ALL
    SELECT 'progress' as source, qr.quest, gt.entry as gameobject_id
    FROM gameobject_template gt
    JOIN gameobject_involvedrelation qr ON qr.id = gt.entry
),
item_quest_relations AS (
    SELECT 'accept' as source, it.startquest as quest, it.entry as item_id
    FROM item_template it
    WHERE it.startquest
),
collected_gossip_menus (base_menu_id, menu_id, text_id, action_menu_id) AS (
    WITH gossip_menu_and_options AS (
        SELECT gm.entry, gm.text_id, NULL as action_menu_id
            FROM gossip_menu gm
        UNION DISTINCT
        SELECT gm.entry, gm.text_id, gmo.action_menu_id
            FROM gossip_menu gm
            LEFT JOIN gossip_menu_option gmo on gmo.menu_id = gm.entry
    )
    SELECT gm.entry as base_menu_id, gm.entry, gm.text_id, gm.action_menu_id
        FROM gossip_menu_and_options gm
    UNION DISTINCT
    SELECT cgm.base_menu_id, gm.entry, gm.text_id, gm.action_menu_id
        FROM gossip_menu_and_options gm
        INNER JOIN collected_gossip_menus cgm ON cgm.action_menu_id = gm.entry
),
creature_data AS (
    SELECT
        ct.entry as id,
        ct.name,
        cgm.text_id,
        cdie.DisplaySexID,
        cdie.DisplayRaceID
    FROM creature_template ct
        JOIN db_CreatureDisplayInfo cdi ON ct.ModelId1 = cdi.ID
        JOIN db_CreatureDisplayInfoExtra cdie ON cdi.ExtendedDisplayInfoID = cdie.ID
        LEFT JOIN collected_gossip_menus cgm ON cgm.base_menu_id = ct.GossipMenuId
),
gameobject_data AS (
    SELECT
        gt.entry as id,
        gt.name,
        cgm.text_id
    FROM gameobject_template gt
        LEFT JOIN collected_gossip_menus cgm ON cgm.base_menu_id =
            CASE gt.type
                WHEN 2  THEN data3  -- GAMEOBJECT_TYPE_QUESTGIVER (type 2) has property "gossipID" in data3 field
                WHEN 8  THEN data10 -- GAMEOBJECT_TYPE_SPELL_FOCUS (type 8) has property "gossipID" in data10 field
                WHEN 10 THEN data19 -- GAMEOBJECT_TYPE_GOOBER (type 10) has property "gossipID" in data19 field
            END
    WHERE gt.type IN (2, 10)
),
numbers AS (
    SELECT 0 AS n
    UNION ALL SELECT 1
    UNION ALL SELECT 2
    UNION ALL SELECT 3
    UNION ALL SELECT 4
    UNION ALL SELECT 5
    UNION ALL SELECT 6
    UNION ALL SELECT 7
    UNION ALL SELECT 8
    UNION ALL SELECT 9
    UNION ALL SELECT 10
    UNION ALL SELECT 11
    UNION ALL SELECT 12
    UNION ALL SELECT 13
    UNION ALL SELECT 14
    UNION ALL SELECT 15
),
ALL_DATA AS (

-- Creature QuestGivers

SELECT
    distinct
    qr.source,
    qr.quest,
    qt.Title as quest_title,
    CASE
        WHEN qr.source = 'accept' THEN qt.Details
        WHEN qr.source = 'progress' THEN qt.RequestItemsText
        ELSE qt.OfferRewardText
    END as "text",
    0 as broadcast_text_id,
    cdie.DisplayRaceID,
    cdie.DisplaySexID,
    ct.name,
    'creature' as type,
    qr.creature_id as id
FROM
    creature_quest_relations qr
JOIN quest_template qt ON qr.quest = qt.entry
JOIN creature_template ct ON qr.creature_id = ct.entry
JOIN db_CreatureDisplayInfo cdi ON ct.ModelId1 = cdi.ID
JOIN db_CreatureDisplayInfoExtra cdie ON cdi.ExtendedDisplayInfoID = cdie.ID
WHERE
    (
        (qr.source = 'accept' AND qt.Details IS NOT NULL AND qt.Details != '')
        OR (qr.source = 'progress' AND qt.RequestItemsText IS NOT NULL AND qt.RequestItemsText != '')
        OR (qr.source = 'complete' AND qt.OfferRewardText IS NOT NULL AND qt.OfferRewardText != '')
    )

-- GameObject QuestGivers

UNION ALL
SELECT
    distinct
    qr.source,
    qr.quest,
    qt.Title as quest_title,
    CASE
        WHEN qr.source = 'accept' THEN qt.Details
        WHEN qr.source = 'progress' THEN qt.RequestItemsText
        ELSE qt.OfferRewardText
    END as "text",
    0 as broadcast_text_id,
    -1 as DisplayRaceID,
    0 as DisplaySexID,
    gt.name,
    'gameobject' as type,
    qr.gameobject_id as id
FROM
    gameobject_quest_relations qr
JOIN quest_template qt ON qr.quest = qt.entry
JOIN gameobject_template gt ON qr.gameobject_id = gt.entry
WHERE
    (
        (qr.source = 'accept' AND qt.Details IS NOT NULL AND qt.Details != '')
        OR (qr.source = 'progress' AND qt.RequestItemsText IS NOT NULL AND qt.RequestItemsText != '')
        OR (qr.source = 'complete' AND qt.OfferRewardText IS NOT NULL AND qt.OfferRewardText != '')
    )

-- Item QuestGivers

UNION ALL
SELECT
    distinct
    qr.source,
    qr.quest,
    qt.Title as quest_title,
    qt.Details as "text",
    0 as broadcast_text_id,
    -1 as DisplayRaceID,
    0 as DisplaySexID,
    it.name,
    'item' as type,
    qr.item_id as id
FROM
    item_quest_relations qr
JOIN quest_template qt ON qr.quest = qt.entry
JOIN item_template it ON qr.item_id = it.entry
WHERE
    (
        (qr.source = 'accept' AND qt.Details IS NOT NULL AND qt.Details != '')
    )

-- Creature Gossip

UNION ALL
SELECT
    distinct
    'gossip' as source,
    '' as quest,
    '' as quest_title,
    IF(creature_data.DisplaySexID = 0, bt.Text, bt.Text1) AS text,
    bt.Id as broadcast_text_id,
    creature_data.DisplayRaceID,
    creature_data.DisplaySexID,
    creature_data.name,
    'creature' as type,
    creature_data.id
FROM creature_data
    CROSS JOIN numbers
    JOIN npc_text nt ON nt.ID = creature_data.text_id
    JOIN broadcast_text bt ON
        CASE numbers.n
            WHEN 0 THEN nt.text0_0
            WHEN 1 THEN nt.text0_1
            WHEN 2 THEN nt.text1_0
            WHEN 3 THEN nt.text1_1
            WHEN 4 THEN nt.text2_0
            WHEN 5 THEN nt.text2_1
            WHEN 6 THEN nt.text3_0
            WHEN 7 THEN nt.text3_1
            WHEN 8 THEN nt.text4_0
            WHEN 9 THEN nt.text4_1
            WHEN 10 THEN nt.text5_0
            WHEN 11 THEN nt.text5_1
            WHEN 12 THEN nt.text6_0
            WHEN 13 THEN nt.text6_1
            WHEN 14 THEN nt.text7_0
            WHEN 15 THEN nt.text7_1
        END = bt.Id
WHERE
    (DisplaySexID = 0 AND bt.Text IS NOT NULL AND bt.Text != '')
    OR (DisplaySexID = 1 AND bt.Text1 IS NOT NULL AND bt.Text1 != '')

-- GameObject Gossip

UNION ALL
SELECT
    distinct
    'gossip' as source,
    '' as quest,
    '' as quest_title,
    IF(creature_data.DisplaySexID = 0, bt.Text, bt.Text1) AS text,
    bt.Id as broadcast_text_id,
    -1 as DisplayRaceID,
    0 as DisplaySexID,
    gameobject_data.name,
    'gameobject' as type,
    gameobject_data.id
FROM gameobject_data
    CROSS JOIN numbers
    JOIN npc_text nt ON nt.ID = gameobject_data.text_id
        JOIN broadcast_text bt ON
        CASE numbers.n
            WHEN 0 THEN nt.text0_0
            WHEN 1 THEN nt.text0_1
            WHEN 2 THEN nt.text1_0
            WHEN 3 THEN nt.text1_1
            WHEN 4 THEN nt.text2_0
            WHEN 5 THEN nt.text2_1
            WHEN 6 THEN nt.text3_0
            WHEN 7 THEN nt.text3_1
            WHEN 8 THEN nt.text4_0
            WHEN 9 THEN nt.text4_1
            WHEN 10 THEN nt.text5_0
            WHEN 11 THEN nt.text5_1
            WHEN 12 THEN nt.text6_0
            WHEN 13 THEN nt.text6_1
            WHEN 14 THEN nt.text7_0
            WHEN 15 THEN nt.text7_1
        END = bt.Id
WHERE
    bt.Text IS NOT NULL AND bt.Text != '' OR
    bt.Text1 IS NOT NULL AND bt.Text1 != ''

-- Creature QuestGreetings

UNION ALL
SELECT
    distinct
    'gossip' as source,
    '' as quest,
    '' as quest_title,
    qg.Text AS text,
    0 as broadcast_text_id,
    creature_data.DisplayRaceID,
    creature_data.DisplaySexID,
    creature_data.name,
    'creature' as type,
    creature_data.id
FROM creature_data
    JOIN questgiver_greeting qg ON qg.entry=creature_data.id AND type=0

-- GameObject QuestGreetings

UNION ALL
SELECT
    distinct
    'gossip' as source,
    '' as quest,
    '' as quest_title,
    qg.Text AS text,
    0 as broadcast_text_id,
    -1 AS DisplayRaceID,
    0 AS DisplaySexID,
    gameobject_data.name,
    'gameobject' as type,
    gameobject_data.id
FROM gameobject_data
    JOIN questgiver_greeting qg ON qg.entry=gameobject_data.id AND type=1

)SELECT
    source,
    quest,
    quest_title,
    text,
    DisplayRaceID,
    DisplaySexID,
    name,
    type,
    id,
    text as original_text
FROM ALL_DATA