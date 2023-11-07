# used to import to RawVoiceline
with data as (select
    0 as expansion,
    vcd.*
from mangos.view_classic_data vcd
union all
select
    2 as expansion,
    vwd.*
from mangos_wrath.view_wrath_data vwd)
select
    uuid(),
    data.*
from data
where
    type = 'creature'

