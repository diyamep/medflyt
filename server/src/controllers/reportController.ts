import { Request, Response } from 'express';
import { QueryResult } from 'pg';
import * as dbUtil from './../utils/dbUtil';

interface Report {
    year: number,
    caregivers: {
        name: string,
        patients: string[]
    }[]
}

export const getReport = async (req: Request, res: Response) => {

    const sql = `
        SELECT
            caregiver.id      AS caregiver_id,
            caregiver.name    AS caregiver_name,
            patient.id        AS patient_id,
            patient.name      AS patient_name,
            visit.date        AS visit_date
        FROM caregiver
        JOIN visit ON visit.caregiver = caregiver.id
        JOIN patient ON patient.id = visit.patient
        WHERE date_part('year', visit.date) = $1
    `;
    
    /* It is possible to concatenate the patient names in the sql query for instance:
    SELECT caregiver_name, string_agg(patient_name, ', ') AS patients
    from
    (
    SELECT
                caregiver.id      AS caregiver_id,
                caregiver.name    AS caregiver_name,
                patient.id        AS patient_id,
                patient.name      AS patient_name,
                visit.date        AS visit_date
            FROM caregiver
            JOIN visit ON visit.caregiver = caregiver.id
            JOIN patient ON patient.id = visit.patient) report
    GROUP BY 1;

    But I assumed you meant to solve it in the server logics
    */

    let result : QueryResult;
    try {
        result = await dbUtil.sqlToDB(sql, [req.params.year]);
        const report: Report = {
            year: parseInt(req.params.year),
            caregivers: []
        };        

        for ( let row of result.rows) {     
            
            // Check if the current caregiver exists
            const caregiver = report.caregivers.find(c => c.name===row.caregiver_name);

            // If the current record is of a new caregiver
            if (!caregiver){
            report.caregivers.push({
                name: row.caregiver_name,
                patients: [row.patient_name]
            })}
            else {  
                // Check if the current record is of a new patient
                if (!caregiver.patients.includes(row.patient_name)){
                    caregiver.patients.push(row.patient_name);
                }
            }
        }
        res.status(200).json(report);
    } catch (error) {
        throw new Error(error.message);
    }

}
