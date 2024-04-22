SELECT 
Public_health_case.add_time,
Public_health_case.local_id AS CaseID
       , substring(Public_health_case.jurisdiction_cd,4,3) as CountyReporting
	   , Public_health_case.cd_desc_txt as EventName
	   , Public_health_case.cd as EventCode
       , Public_health_case.mmwr_year as MMWRYear,Public_health_case.mmwr_week as MMWRWeek,
	   
	   case when Public_health_case.case_class_cd = 'C' then 'Confirmed'
	   when Public_health_case.case_class_cd = 'P' then 'Probable'
	    when Public_health_case.case_class_cd = 'S' then 'Suspect'
		when Public_health_case.case_class_cd = 'N' then 'Not a Case/Deleted'

		else 'Unknown' end as CaseClassStatus
       , case when Person.curr_sex_cd ='M' then '1'
	   when Person.curr_sex_cd ='F' then '2'
	   else '9' end as Sex
       , cast(Person.birth_time as date) as BirthDate
       , Person.age_reported as Age
       , case when Person.age_reported_unit_cd ='Y' then '0'
	   when Person.age_reported_unit_cd ='W' then '2'
	   when Person.age_reported_unit_cd ='U' then '999'
	      when Person.age_reported_unit_cd ='M' then '1'
		     when Person.age_reported_unit_cd ='H' then '999'
			    when Person.age_reported_unit_cd ='D' then '3'
				else '999' end as AgeType

       , case when Person_race.race_category_cd ='1002-5' then '1'
	   when Person_race.race_category_cd ='2028-9' then '2'
	   when Person_race.race_category_cd ='2054-5' then '3'
	   when Person_race.race_category_cd ='2106-3' then '5'
	   when Person_race.race_category_cd ='2076-8' then '2'
	   else '9' end as Race
       ,case when Person.ethnic_group_ind ='2135-2' then '1'
	   when Person.ethnic_group_ind ='2186-5' then '2'
	   else '9' end as Ethnicity
FROM Public_health_case with (nolock)
       INNER JOIN Participation with (nolock) ON Participation.act_uid = Public_health_case.public_health_case_uid
              AND Participation.type_cd = 'SubjOfPHC'
       INNER JOIN Person with (nolock) ON Person.person_uid = Participation.subject_entity_uid
          LEFT OUTER JOIN Person_race with (nolock) ON Person.person_uid = Person_race.person_uid
      
WHERE Public_health_case.record_status_cd!='LOG_DEL'
       AND Public_health_case.mmwr_year = ?
	   