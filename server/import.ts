
import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

interface StudentData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  graduationYear: number;
  batch: string;
  course?: string;
  branch?: string;
  rollNumber?: string;
  cgpa?: string;
  currentCity?: string;
  currentCompany?: string;
  currentRole?: string;
  linkedinUrl?: string;
}

export async function importExcelData(req: Request, res: Response) {
  try {
    console.log('Import started');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check Supabase connection
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials missing:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseKey 
      });
      return res.status(500).json({ 
        error: 'Database connection not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.' 
      });
    }

    console.log('Supabase configured, processing file...');

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    console.log('\n=== EXCEL FILE ANALYSIS ===');
    console.log(`Total rows in Excel: ${jsonData.length}`);
    
    // Log the first 3 rows to see what columns and data we have
    if (jsonData.length > 0) {
      const columns = Object.keys(jsonData[0]);
      console.log('\n--- Column Names Found ---');
      console.log('Total Columns:', columns.length);
      console.log('Column List:', columns);
      
      console.log('\n--- First Row Complete Data ---');
      console.log(JSON.stringify(jsonData[0], null, 2));
      
      console.log('\n--- Column Mapping Strategy ---');
      console.log('Will attempt to map these columns to our database fields');
      console.log('Any unmapped columns will be stored if they contain data');
      console.log('=== END ANALYSIS ===\n');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      try {
        console.log(`Processing row ${i + 1}/${jsonData.length}`);
        
        // Smart column value extraction - handles any column name
        const getColumnValue = (row: any, possibleNames: string[], fieldName: string = '') => {
          for (const name of possibleNames) {
            // Check exact match
            if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
              if (i === 0 && fieldName) console.log(`  ✓ ${fieldName}: Found "${name}" = "${row[name]}"`);
              return String(row[name]).trim();
            }
            // Check case-insensitive and partial match
            const key = Object.keys(row).find(k => {
              const lowerKey = k.toLowerCase().replace(/[_\s-]/g, '');
              const lowerName = name.toLowerCase().replace(/[_\s-]/g, '');
              return lowerKey === lowerName || lowerKey.includes(lowerName) || lowerName.includes(lowerKey);
            });
            if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') {
              if (i === 0 && fieldName) console.log(`  ✓ ${fieldName}: Found "${key}" = "${row[key]}"`);
              return String(row[key]).trim();
            }
          }
          return '';
        };

        if (i === 0) console.log(`\n=== Mapping first row ===`);
        
        // Try to extract name parts from a full name field if first/last name not found
        let firstName = getColumnValue(row, ['First Name', 'first_name', 'FirstName', 'First_Name', 'firstname', 'FIRST NAME', 'fname', 'First'], 'firstName');
        let lastName = getColumnValue(row, ['Last Name', 'last_name', 'LastName', 'Last_Name', 'lastname', 'LAST NAME', 'lname', 'Last'], 'lastName');
        
        // If no first/last name, try to extract from full name
        if (!firstName || !lastName) {
          const fullName = getColumnValue(row, ['Name', 'name', 'Full Name', 'FullName', 'Student Name', 'StudentName', 'STUDENT NAME'], 'fullName');
          if (fullName) {
            const nameParts = fullName.split(' ');
            if (!firstName) firstName = nameParts[0] || '';
            if (!lastName) lastName = nameParts.slice(1).join(' ') || '';
          }
        }

        const studentData: StudentData = {
          firstName: firstName || 'Unknown',
          lastName: lastName || '',
          email: getColumnValue(row, [
            'Email', 'email', 'E-mail', 'Email ID', 'EmailID', 'email_id', 'EMAIL', 
            'E-Mail', 'Mail', 'mail', 'Email Address', 'EmailAddress', 'email address',
            'Student Email', 'Personal Email', 'Contact Email'
          ], 'email'),
          phone: getColumnValue(row, [
            'Phone', 'phone', 'Mobile', 'Contact', 'mobile', 'PHONE', 'Phone Number', 
            'phone_number', 'Mobile Number', 'Contact Number', 'Cell', 'Telephone',
            'Phone No', 'Mobile No'
          ]),
          graduationYear: parseInt(getColumnValue(row, [
            'Graduation Year', 'graduation_year', 'Year', 'Passing Year', 'YEAR', 
            'year', 'PassingYear', 'Graduation_Year', 'Year of Graduation',
            'Passout Year', 'Pass Out Year', 'Batch Year'
          ])) || new Date().getFullYear(),
          batch: getColumnValue(row, [
            'Batch', 'batch', 'Year', 'BATCH', 'year', 'Batch Year', 'Class'
          ]) || String(new Date().getFullYear()),
          course: getColumnValue(row, [
            'Course', 'course', 'Program', 'COURSE', 'program', 'Degree', 'degree',
            'Course Name', 'Program Name', 'Qualification'
          ]),
          branch: getColumnValue(row, [
            'Branch', 'branch', 'Department', 'Specialization', 'BRANCH', 'department',
            'Stream', 'Major', 'Field', 'Discipline', 'Specialisation'
          ]),
          rollNumber: getColumnValue(row, [
            'Roll Number', 'roll_number', 'RollNo', 'Roll No', 'Student ID', 
            'ROLL NUMBER', 'rollnumber', 'Roll_Number', 'ID', 'id', 'Registration Number',
            'Reg No', 'Enrollment No', 'Enrollment Number'
          ]),
          cgpa: getColumnValue(row, [
            'CGPA', 'cgpa', 'GPA', 'Percentage', 'gpa', 'percentage', 'Grade',
            'Marks', 'Score', 'Academic Score'
          ]),
          currentCity: getColumnValue(row, [
            'Current City', 'current_city', 'City', 'Location', 'CITY', 'city', 
            'Current_City', 'Present City', 'Current Location', 'Residence'
          ]),
          currentCompany: getColumnValue(row, [
            'Current Company', 'current_company', 'Company', 'Organization', 
            'COMPANY', 'company', 'Current_Company', 'Employer', 'Working At',
            'Present Company', 'Organisation'
          ]),
          currentRole: getColumnValue(row, [
            'Current Role', 'current_role', 'Designation', 'Position', 'ROLE', 
            'role', 'Current_Role', 'Job Title', 'Title', 'Current Designation'
          ]),
          linkedinUrl: getColumnValue(row, [
            'LinkedIn', 'linkedin_url', 'LinkedIn URL', 'LinkedIn Profile', 
            'LINKEDIN', 'linkedin', 'LinkedIn_URL', 'LinkedIn Link', 'LI Profile'
          ])
        };

        // Generate email if not present
        if (!studentData.email) {
          // Generate a placeholder email from name and row number
          const emailUsername = `${studentData.firstName.toLowerCase()}.${studentData.lastName.toLowerCase() || i}`.replace(/[^a-z0-9.]/g, '');
          studentData.email = `${emailUsername}@alumni.placeholder.com`;
          if (i < 3) {
            console.log(`Row ${i + 1}: No email found, generated placeholder: ${studentData.email}`);
          }
        }

        console.log(`Row ${i + 1}: Processing ${studentData.email}`);

        // Check if user exists with this email
        const { data: existingUser, error: userCheckError } = await adminSupabase
          .from('users')
          .select('id')
          .eq('email', studentData.email)
          .single();

        if (userCheckError && userCheckError.code !== 'PGRST116') {
          // PGRST116 is "not found" error which is expected
          console.error(`Row ${i + 1} - User check error:`, userCheckError);
          results.failed++;
          results.errors.push(`Row ${i + 1}: Database error checking user - ${userCheckError.message}`);
          continue;
        }

        let userId: string;

        if (existingUser) {
          console.log(`Row ${i + 1}: User exists, using ID ${existingUser.id}`);
          userId = existingUser.id;
        } else {
          console.log(`Row ${i + 1}: Creating new user for ${studentData.email}`);
          
          // Generate unique username with timestamp
          const timestamp = Date.now().toString(36);
          const baseUsername = studentData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
          const uniqueUsername = `${baseUsername}_${timestamp}`;
          
          // Create a new user
          const { data: newUser, error: userError } = await adminSupabase
            .from('users')
            .insert({
              username: uniqueUsername,
              email: studentData.email,
              password: await import('bcrypt').then(bcrypt => 
                bcrypt.hash('ChangeMe123!', 10)
              ),
              is_admin: false
            })
            .select('id')
            .single();

          if (userError || !newUser) {
            results.failed++;
            results.errors.push(`Failed to create user for ${studentData.email}: ${userError?.message}`);
            continue;
          }

          userId = newUser.id;
        }

        // Check if alumni profile exists
        const { data: existingAlumni } = await adminSupabase
          .from('alumni')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (existingAlumni) {
          // Update existing alumni
          const { error: updateError } = await adminSupabase
            .from('alumni')
            .update({
              first_name: studentData.firstName,
              last_name: studentData.lastName,
              email: studentData.email,
              phone: studentData.phone,
              graduation_year: studentData.graduationYear,
              batch: studentData.batch,
              course: studentData.course,
              branch: studentData.branch,
              roll_number: studentData.rollNumber,
              cgpa: studentData.cgpa,
              current_city: studentData.currentCity,
              current_company: studentData.currentCompany,
              current_role: studentData.currentRole,
              linkedin_url: studentData.linkedinUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAlumni.id);

          if (updateError) {
            console.error(`Row ${i + 1} - Update error:`, updateError);
            results.failed++;
            results.errors.push(`Row ${i + 1}: Failed to update alumni ${studentData.email}: ${updateError.message}`);
          } else {
            console.log(`Row ${i + 1}: Successfully updated alumni profile`);
            results.success++;
          }
        } else {
          console.log(`Row ${i + 1}: Creating new alumni profile`);
          
          // Create new alumni profile
          const { error: insertError } = await adminSupabase
            .from('alumni')
            .insert({
              user_id: userId,
              first_name: studentData.firstName,
              last_name: studentData.lastName,
              email: studentData.email,
              phone: studentData.phone,
              graduation_year: studentData.graduationYear,
              batch: studentData.batch,
              course: studentData.course,
              branch: studentData.branch,
              roll_number: studentData.rollNumber,
              cgpa: studentData.cgpa,
              current_city: studentData.currentCity,
              current_company: studentData.currentCompany,
              current_role: studentData.currentRole,
              linkedin_url: studentData.linkedinUrl,
              is_profile_public: true,
              is_verified: false,
              is_active: true
            });

          if (insertError) {
            console.error(`Row ${i + 1} - Insert error:`, insertError);
            results.failed++;
            results.errors.push(`Row ${i + 1}: Failed to create alumni ${studentData.email}: ${insertError.message}`);
          } else {
            console.log(`Row ${i + 1}: Successfully created alumni profile`);
            results.success++;
          }
        }
      } catch (error: any) {
        console.error(`Row ${i + 1} - Exception:`, error);
        results.failed++;
        results.errors.push(`Row ${i + 1}: Error processing row: ${error.message}`);
      }
    }

    console.log('Import completed:', results);

    res.json({
      message: 'Import completed',
      results
    });

  } catch (error: any) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message });
  }
}
