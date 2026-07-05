export const clientConfig = {
    companyName: 'GSTC Permit Suite',
    siteName: 'GSTC Operations',
    defaultLocale: 'en',
    roles: {
        fieldSupervisor: 'Field Supervisor',
        areaAuthority: 'Area Authority',
        hseOfficer: 'HSE Officer',
        supervisor: 'Supervisor',
        manager: 'Manager',
        admin: 'Admin',
    },
    workflow: ['Draft', 'Pending Review', 'Pending Approval', 'Approved', 'Work in Progress', 'Closed', 'Rejected', 'Cancelled'],
} as const
