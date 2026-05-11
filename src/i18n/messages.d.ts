/**
 * Type-safe next-intl message declarations.
 *
 * AUTO-GENERATED from messages/es.json (the authoritative locale).
 * Do NOT edit manually — regenerate by running:
 *   node scripts/generate-messages-types.mjs
 *
 * HOW IT WORKS:
 *   next-intl v4+ reads this interface via TypeScript module augmentation.
 *   Registering IntlMessages via AppConfig activates STRICT MODE — every
 *   useTranslations(namespace) and t(key) call is type-checked against this
 *   interface, so unknown namespaces and keys produce compile-time errors.
 *
 * CONCURRENT AGENT NOTE (A3 / i18n native routing):
 *   Agent A3 may add new keys to messages/es.json for routing labels.
 *   After A3 merges, run the generator again so this file stays in sync.
 *   No conflict expected — A3 touches next.config.ts i18n routing block
 *   and src/proxy.ts; this file is standalone.
 */

// Strict mode active — every useTranslations(namespace) and t(key) call is
// type-checked against IntlMessages. Unknown namespaces/keys are compile errors.
// See: https://next-intl.dev/docs/workflows/typescript
declare module "next-intl" {
  interface AppConfig {
    Messages: IntlMessages;
  }
}

export interface IntlMessages {
  nav: {
    sections: {
      overview: string;
      catalogs: string;
      administration: string;
      clubs: string;
      validation: string;
      communications: string;
      requests_reports: string;
      members: string;
    };
    items: {
      dashboard: string;
      users: string;
      catalogs_root: string;
      geography_countries: string;
      geography_unions: string;
      geography_local_fields: string;
      geography_districts: string;
      geography_churches: string;
      allergies: string;
      diseases: string;
      medicines: string;
      relationship_types: string;
      ecclesiastical_years: string;
      club_types: string;
      club_ideals: string;
      honor_categories: string;
      activity_types: string;
      resources: string;
      resources_all: string;
      resources_categories: string;
      rbac: string;
      rbac_permissions: string;
      rbac_roles: string;
      configuration: string;
      settings_system: string;
      settings_scoring: string;
      jobs_queues: string;
      clubs: string;
      camporees: string;
      camporees_local: string;
      camporees_union: string;
      classes: string;
      enrollments: string;
      honors: string;
      achievements: string;
      activities: string;
      finances: string;
      inventory: string;
      certifications: string;
      insurance: string;
      insurance_by_section: string;
      insurance_expiring: string;
      validation: string;
      investiture: string;
      investiture_pending: string;
      investiture_pipeline: string;
      investiture_config: string;
      sla: string;
      year_end: string;
      notifications: string;
      notifications_send: string;
      notifications_history: string;
      evidence_review: string;
      evidence_folders: string;
      annual_folders: string;
      annual_folders_templates: string;
      annual_folders_mine: string;
      annual_folders_evaluate: string;
      annual_folders_rankings: string;
      annual_folders_categories: string;
      member_rankings: string;
      member_ranking_weights: string;
      ranking_weights: string;
      section_rankings: string;
      requests: string;
      requests_transfers: string;
      requests_assignments: string;
      requests_membership: string;
      reports: string;
      reports_mine: string;
      reports_supervision: string;
      member_of_month: string;
      catalog_classes: string;
      catalog_class_modules: string;
      catalog_class_sections: string;
      catalog_folders: string;
      catalog_folder_modules: string;
      catalog_folder_sections: string;
      catalog_finance_categories: string;
      catalog_inventory_categories: string;
      catalog_honors: string;
      catalog_master_honors: string;
    };
    breadcrumbs: {
      dashboard: string;
      users: string;
      catalogs: string;
      geography: string;
      countries: string;
      unions: string;
      "local-fields": string;
      districts: string;
      churches: string;
      allergies: string;
      diseases: string;
      medicines: string;
      "relationship-types": string;
      "ecclesiastical-years": string;
      "club-types": string;
      "club-ideals": string;
      "honor-categories": string;
      clubs: string;
      new: string;
      instances: string;
      camporees: string;
      classes: string;
      honors: string;
      activities: string;
      finances: string;
      inventory: string;
      certifications: string;
      insurance: string;
      notifications: string;
      folders: string;
      rbac: string;
      permissions: string;
      roles: string;
      matrix: string;
    };
    themeToggle: {
      switchToLight: string;
      switchToDark: string;
      switchTheme: string;
    };
    a11y: {
      skipToContent: string;
    };
  };
  permissions: {
    groups: {
      users: string;
      roles: string;
      clubs: string;
      units: string;
      member_of_month: string;
      scoring_categories: string;
      requests: string;
      user_certifications: string;
      user_folders: string;
      geography: string;
      catalogs: string;
      classes_honors: string;
      activities: string;
      camporees: string;
      validation: string;
      finances: string;
      inventory: string;
      reports: string;
      notifications: string;
      resources: string;
      system: string;
    };
  };
  catalogs: {
    actions: {
      create: string;
      edit: string;
      empty_state: string;
    };
    fields: {
      name: string;
      description: string;
      active: string;
      abbreviation: string;
      code: string;
      start_date: string;
      end_date: string;
      country: string;
      union: string;
      local_field: string;
      district: string;
      club_type: string;
    };
    entities: {
      countries: {
        title: string;
        singular: string;
        description: string;
      };
      unions: {
        title: string;
        singular: string;
        description: string;
      };
      "local-fields": {
        title: string;
        singular: string;
        description: string;
      };
      districts: {
        title: string;
        singular: string;
        description: string;
      };
      churches: {
        title: string;
        singular: string;
        description: string;
      };
      "relationship-types": {
        title: string;
        singular: string;
        description: string;
      };
      allergies: {
        title: string;
        singular: string;
        description: string;
      };
      diseases: {
        title: string;
        singular: string;
        description: string;
      };
      medicines: {
        title: string;
        singular: string;
        description: string;
      };
      "ecclesiastical-years": {
        title: string;
        singular: string;
        description: string;
      };
      "club-types": {
        title: string;
        singular: string;
        description: string;
      };
      "club-ideals": {
        title: string;
        singular: string;
        description: string;
      };
      "activity-types": {
        title: string;
        singular: string;
        description: string;
      };
    };
    errors: {
      entity_not_supported: string;
      read_only_catalog: string;
      op_create_failed: string;
      op_update_failed: string;
      op_delete_failed: string;
      load_data_failed: string;
    };
    validation: {
      delete_target_not_identified: string;
    };
    success: {
      op_create_title: string;
      op_create_description: string;
      op_update_title: string;
      op_update_description: string;
      op_delete_title: string;
      op_delete_description: string;
    };
    crudPage: {
      readOnly: string;
      noRecords: string;
      noResults: string;
      noResultsDesc: string;
      clearFilters: string;
      colStatus: string;
      colActions: string;
      statusActive: string;
      statusInactive: string;
      editRecord: string;
      deleteRecord: string;
      listOf: string;
      edit: string;
      delete: string;
      editItem: string;
      deleteItem: string;
    };
    deleteDialog: {
      title: string;
      description: string;
      cancel: string;
      delete: string;
      deleting: string;
    };
    filterBar: {
      removeFilter: string;
      of: string;
      records: string;
      recordsCount: string;
      statusAll: string;
      statusActive: string;
      statusInactive: string;
      filtersOf: string;
      searchIn: string;
      searchPlaceholder: string;
      filterByStatus: string;
      clearAllFilters: string;
      clear: string;
      activeFilters: string;
      filtersLabel: string;
      searchChip: string;
    };
    honorCategories: {
      pageTitle: string;
      pageDescription: string;
      createCategory: string;
      filtersTitle: string;
      filtersSubtitle: string;
      filterName: string;
      filterNamePlaceholder: string;
      filterStatus: string;
      statusAll: string;
      statusActive: string;
      statusInactive: string;
      noResults: string;
      noResultsDesc: string;
      emptyTitle: string;
      emptyDesc: string;
      colCategory: string;
      colDescription: string;
      colHonorsCount: string;
      colStatus: string;
      colActions: string;
      fieldName: string;
      fieldDescription: string;
      fieldDescriptionPlaceholder: string;
      fieldActive: string;
      createDialogTitle: string;
      createDialogDesc: string;
      editDialogTitle: string;
      deleteDialogTitle: string;
      deleteDialogDesc: string;
      edit: string;
      delete: string;
      cancel: string;
      create: string;
      saveChanges: string;
      noPermissions: string;
    };
    phaseE: {
      filtersTitle: string;
      filtersSubtitle: string;
      filterName: string;
      filterNamePlaceholder2: string;
      filterStatus: string;
      statusAll: string;
      statusActive: string;
      statusInactive: string;
      noResults: string;
      noResultsDesc: string;
      emptyTitle: string;
      emptyDesc: string;
      colName: string;
      colDescription: string;
      colStatus: string;
      colActions: string;
      fieldName: string;
      fieldNamePlaceholder: string;
      fieldDescription: string;
      fieldDescriptionPlaceholder: string;
      fieldActive: string;
      create: string;
      createSubmit: string;
      createDialogTitle: string;
      createDialogDesc: string;
      editDialogTitle: string;
      deleteDialogTitle: string;
      deleteDialogDesc: string;
      edit: string;
      delete: string;
      cancel: string;
      saveChanges: string;
      noPermissions: string;
    };
    pages: {
      countries: {
        title: string;
        description: string;
        metadataTitle: string;
      };
      churches: {
        title: string;
        description: string;
        metadataTitle: string;
      };
      districts: {
        title: string;
        description: string;
        metadataTitle: string;
      };
      unions: {
        title: string;
        description: string;
        metadataTitle: string;
      };
      unionsDetail: {
        back: string;
        tabInfo: string;
        tabScoringCategories: string;
        cardTitle: string;
        labelName: string;
        labelAbbreviation: string;
        labelCountry: string;
        labelStatus: string;
        statusActive: string;
        statusInactive: string;
      };
      localFields: {
        title: string;
        description: string;
        metadataTitle: string;
      };
      localFieldsDetail: {
        back: string;
        tabInfo: string;
        tabScoringCategories: string;
        cardTitle: string;
        labelName: string;
        labelAbbreviation: string;
        labelUnion: string;
        labelStatus: string;
        statusActive: string;
        statusInactive: string;
      };
      activityTypes: {
        title: string;
        description: string;
        metadataTitle: string;
      };
      folderSections: {
        title: string;
        description: string;
        entityLabel: string;
        loadError: string;
      };
      folderModules: {
        title: string;
        description: string;
        entityLabel: string;
        loadError: string;
      };
      catalogFolders: {
        title: string;
        description: string;
        entityLabel: string;
        loadError: string;
      };
      classSections: {
        title: string;
        description: string;
        entityLabel: string;
        loadError: string;
      };
      classModules: {
        title: string;
        description: string;
        entityLabel: string;
        loadError: string;
      };
      classes: {
        title: string;
        description: string;
        entityLabel: string;
        loadError: string;
      };
      root: {
        title: string;
        description: string;
        sectionGeography: string;
        sectionReference: string;
        readOnly: string;
        cardCountries: string;
        cardCountriesDesc: string;
        cardUnions: string;
        cardUnionsDesc: string;
        cardLocalFields: string;
        cardLocalFieldsDesc: string;
        cardDistricts: string;
        cardDistrictsDesc: string;
        cardChurches: string;
        cardChurchesDesc: string;
        cardAllergies: string;
        cardAllergiesDesc: string;
        cardDiseases: string;
        cardDiseasesDesc: string;
        cardMedicines: string;
        cardMedicinesDesc: string;
        cardRelationshipTypes: string;
        cardRelationshipTypesDesc: string;
        cardEcclesiasticalYears: string;
        cardEcclesiasticalYearsDesc: string;
        cardClubTypes: string;
        cardClubTypesDesc: string;
        cardClubIdeals: string;
        cardClubIdealsDesc: string;
        cardHonorCategories: string;
        cardHonorCategoriesDesc: string;
      };
      financeCategories: {
        title: string;
        description: string;
        entityLabel: string;
        loadError: string;
      };
      inventoryCategories: {
        title: string;
        description: string;
        entityLabel: string;
        loadError: string;
      };
      honorsCatalog: {
        title: string;
        description: string;
        entityLabel: string;
        loadError: string;
      };
      masterHonors: {
        title: string;
        description: string;
        entityLabel: string;
        loadError: string;
      };
      honorCategoriesList: {
        forbidden: string;
        loadError: string;
      };
      honorCategoriesDetail: {
        forbidden: string;
        pageTitle: string;
        backButton: string;
        categorySubtitle: string;
        active: string;
        inactive: string;
        cardGeneralTitle: string;
        infoId: string;
        infoName: string;
        infoHonorsCount: string;
        infoStatus: string;
        cardDescriptionTitle: string;
        noDescription: string;
        cardHonorsTitle: string;
        noHonors: string;
        tableId: string;
        tableName: string;
        tableLevel: string;
        tableStatus: string;
      };
      diseases: {
        title: string;
        description: string;
        metadataTitle: string;
      };
      clubTypes: {
        title: string;
        description: string;
        metadataTitle: string;
      };
      medicines: {
        title: string;
        description: string;
        metadataTitle: string;
      };
      clubIdeals: {
        title: string;
        description: string;
        metadataTitle: string;
      };
      allergies: {
        title: string;
        description: string;
        metadataTitle: string;
      };
      relationshipTypes: {
        title: string;
        description: string;
        metadataTitle: string;
      };
      ecclesiasticalYears: {
        title: string;
        description: string;
        metadataTitle: string;
      };
    };
  };
  auth: {
    login: {
      brand_subtitle: string;
      welcome_title: string;
      welcome_description: string;
      eyebrow: string;
      email_label: string;
      email_placeholder: string;
      password_label: string;
      submit_idle: string;
      submit_loading: string;
      show_password: string;
      hide_password: string;
      verse_reference: string;
      verse_text: string;
      brand_description: string;
      version_label: string;
      region_label: string;
    };
    validation: {
      email_invalid: string;
      password_min: string;
      credentials_invalid: string;
    };
    errors: {
      invalid_credentials: string;
      connection: string;
      session_no_permissions: string;
      server_unavailable: string;
      generic_login: string;
      login_failed: string;
      profile_validation_failed: string;
      admin_role_required: string;
      denied_no_admin_role: string;
      denied_incomplete_registration: string;
      denied_inactive: string;
      denied_email_unconfirmed: string;
      denied_unauthorized: string;
      denied_default: string;
    };
  };
  clubs: {
    errors: {
      create_club_failed: string;
      update_club_failed: string;
      create_section_failed: string;
      update_section_failed: string;
      sync_section_failed: string;
      create_role_assignment_failed: string;
      update_role_failed: string;
      remove_assignment_failed: string;
      club_created_no_id: string;
      club_created_sections_failed: string;
    };
    validation: {
      field_required: string;
      field_invalid: string;
      coordinates_incomplete: string;
      coordinates_invalid: string;
      club_name_required: string;
      club_type_required: string;
      club_type_invalid: string;
      souls_target_positive: string;
      fee_positive: string;
      section_status_invalid: string;
      no_changes: string;
      no_changes_section: string;
      user_id_required: string;
      role_required: string;
      ecclesiastical_year_invalid: string;
      member_not_identified: string;
      assignment_not_identified: string;
      assignment_remove_not_identified: string;
    };
    success: {
      section_created: string;
      section_created_short: string;
      section_updated: string;
      assignment_created: string;
      assignment_removed: string;
      role_updated: string;
      retry_failed_sections: string;
    };
    fields: {
      local_field: string;
      district: string;
      church: string;
      ecclesiastical_year: string;
    };
    form: {
      labelName: string;
      labelDescription: string;
      labelAddress: string;
      labelLatitude: string;
      labelLongitude: string;
      coordinatesTitle: string;
    };
    create: {
      cardTitle: string;
      submitButton: string;
      placeholderName: string;
      placeholderDescription: string;
      placeholderLocalField: string;
      placeholderDistrict: string;
      placeholderChurch: string;
      placeholderAddress: string;
    };
    edit: {
      cardTitle: string;
      submitButton: string;
      placeholderSelect: string;
      labelActive: string;
    };
    sections: {
      description: string;
      labelSoulsTarget: string;
      labelFee: string;
      labelMeetingDay: string;
      placeholderMeetingDay: string;
      labelMeetingTime: string;
      createButton: string;
      notCreated: string;
      cancelButton: string;
      addButton: string;
      statusActive: string;
      statusInactive: string;
      infoType: string;
      infoSectionId: string;
      infoCuota: string;
      infoMembers: string;
    };
    pages: {
      list: {
        title: string;
        description: string;
        createButton: string;
        colName: string;
        colLocalField: string;
        colDistrict: string;
        colChurch: string;
        colStatus: string;
        colActions: string;
        statusActive: string;
        statusInactive: string;
        mobileListLabel: string;
        endpointError: string;
        cannotShow: string;
        emptyTitle: string;
        emptyDescription: string;
        emptyCreateButton: string;
      };
      new: {
        title: string;
        back: string;
      };
      detail: {
        back: string;
        deleteButton: string;
        tabView: string;
        tabEdit: string;
        tabSections: string;
        tabUnits: string;
        tabMembership: string;
        infoCardTitle: string;
        labelName: string;
        labelDescription: string;
        labelStatus: string;
        labelLocalField: string;
        labelDistrict: string;
        labelChurch: string;
        labelAddress: string;
        labelCoordinates: string;
        statusActive: string;
        statusInactive: string;
      };
      unitsNew: {
        title: string;
        descriptionTemplate: string;
        back: string;
      };
      unitsDetail: {
        title: string;
        descriptionTemplate: string;
        back: string;
      };
    };
    a11y: {
      deleteClub: string;
      actionsMenu: string;
    };
  };
  dashboardHub: {
    title: string;
    description: string;
    stats: {
      registeredUsers: string;
      pendingApproval: string;
      totalInSystem: string;
      activeClubs: string;
      totalClubs: string;
      activeClubsStatus: string;
      camporees: string;
      activeEvents: string;
      honors: string;
      totalClasses: string;
      totalHonors: string;
    };
    recentUsers: {
      title: string;
      description: string;
      viewAll: string;
      noRole: string;
      loadError: string;
    };
    relativeDate: {
      today: string;
      yesterday: string;
      daysAgo: string;
      weeksAgo: string;
    };
    roleChart: {
      title: string;
      description: string;
      noRolesFound: string;
      basedOn: string;
      userCount: string;
    };
    quickLinks: {
      title: string;
      users: string;
      usersDesc: string;
      clubs: string;
      clubsDesc: string;
      classes: string;
      classesDesc: string;
      honors: string;
      honorsDesc: string;
    };
    roleLabels: {
      superAdmin: string;
      admin: string;
      assistantAdmin: string;
      coordinator: string;
      pastor: string;
      user: string;
      director: string;
      deputyDirector: string;
      secretary: string;
      treasurer: string;
      counselor: string;
      instructor: string;
      member: string;
      noRole: string;
    };
  };
  post_registration: {
    errors: {
      step_failed: string;
    };
    success: {
      step_completed: string;
    };
  };
  admin_users: {
    errors: {
      invalid_decision_title: string;
      invalid_decision_description: string;
      too_many_requests_title: string;
      too_many_requests_description: string;
      forbidden_title: string;
      forbidden_description: string;
      endpoint_unavailable_title: string;
      endpoint_unavailable_description: string;
      processing_title: string;
      unexpected_title: string;
      unexpected_description: string;
    };
    success: {
      user_approved_title: string;
      user_rejected_title: string;
      decision_recorded: string;
    };
  };
  notifications: {
    errors: {
      send_failed: string;
      broadcast_failed: string;
      club_send_failed: string;
    };
    validation: {
      user_id_required: string;
      title_required: string;
      body_required: string;
      instance_type_required: string;
      instance_type_invalid: string;
      instance_id_required: string;
      instance_id_invalid: string;
    };
    success: {
      sent: string;
      broadcast_sent: string;
      club_sent: string;
    };
    forms: {
      direct_title: string;
      direct_description: string;
      broadcast_title: string;
      broadcast_description: string;
      broadcast_warning: string;
      club_title: string;
      club_description: string;
      label_user_id: string;
      placeholder_user_id: string;
      label_title: string;
      placeholder_title_notification: string;
      placeholder_title_broadcast: string;
      label_body: string;
      placeholder_body: string;
      label_instance_type: string;
      placeholder_instance_type: string;
      option_adventurers: string;
      option_pathfinders: string;
      option_master_guilds: string;
      label_instance_id: string;
      placeholder_instance_id: string;
      submit_send: string;
      submit_broadcast: string;
      submit_club: string;
    };
    history: {
      col_title: string;
      col_type: string;
      col_target: string;
      col_sent: string;
      col_failed: string;
      col_sent_by: string;
      col_date: string;
      empty_title: string;
      empty_description: string;
      error_load: string;
      type_broadcast: string;
      type_user: string;
      type_club: string;
      target_all: string;
      target_user: string;
      target_club_section: string;
    };
    page: {
      title: string;
      description: string;
    };
    pageHistory: {
      title: string;
      description: string;
      loadingFallback: string;
    };
  };
  units: {
    errors: {
      create_failed: string;
      update_failed: string;
    };
    validation: {
      name_required: string;
      club_type_required: string;
      member_required: string;
      member_invalid: string;
    };
    fields: {
      captain: string;
      secretary: string;
      advisor: string;
      substitute_advisor: string;
    };
  };
  honors: {
    errors: {
      no_permission_create: string;
      no_permission_update: string;
      no_permission_delete: string;
      create_failed: string;
      update_failed: string;
      delete_failed: string;
      unexpected: string;
      approve_failed: string;
      save_approve_failed: string;
      reject_failed: string;
      delete_requirement_failed: string;
    };
    validation: {
      honor_name_required: string;
      field_invalid: string;
      no_changes: string;
      honor_not_identified: string;
    };
    crud: {
      pageTitle: string;
      pageDescription: string;
      createButton: string;
      filtersTitle: string;
      filtersSubtitle: string;
      filterNameLabel: string;
      filterNamePlaceholder: string;
      filterCategoryLabel: string;
      filterCategoryPlaceholder: string;
      filterCategoryAll: string;
      filterClubTypeLabel: string;
      filterClubTypePlaceholder: string;
      filterClubTypeAll: string;
      filterLevelLabel: string;
      filterLevelPlaceholder: string;
      filterLevelAll: string;
      filterLevelItem: string;
      filterStatusLabel: string;
      filterStatusPlaceholder: string;
      filterStatusAll: string;
      filterStatusActive: string;
      filterStatusInactive: string;
      emptyTitle: string;
      emptyDescription: string;
      emptyFilterTitle: string;
      emptyFilterDescription: string;
      tableHeaderHonor: string;
      tableHeaderCategory: string;
      tableHeaderClubType: string;
      tableHeaderLevel: string;
      tableHeaderStatus: string;
      tableHeaderActions: string;
      badgeActive: string;
      badgeInactive: string;
      editButton: string;
      editAriaLabel: string;
      deleteButton: string;
      actionsButton: string;
      noPermissionBanner: string;
      deleteDialogTitle: string;
      deleteDialogDescription: string;
      deleteDialogCancel: string;
      deleteDialogConfirm: string;
      deleteAriaLabel: string;
      actionsAriaLabel: string;
    };
    form: {
      submitCreate: string;
      submitEdit: string;
      cancelButton: string;
      sectionDataTitle: string;
      sectionResourcesTitle: string;
      nameLabel: string;
      namePlaceholder: string;
      descriptionLabel: string;
      descriptionPlaceholder: string;
      categoryLabel: string;
      categoryPlaceholder: string;
      clubTypeLabel: string;
      clubTypePlaceholder: string;
      levelLabel: string;
      masterHonorLabel: string;
      activeLabel: string;
      imageLabel: string;
      imagePlaceholder: string;
      materialLabel: string;
      materialPlaceholder: string;
      yearLabel: string;
      yearPlaceholder: string;
    };
    pages: {
      list: {
        loadError: string;
      };
      new: {
        title: string;
        description: string;
        backButton: string;
      };
      detail: {
        title: string;
        backButton: string;
        active: string;
        inactive: string;
        cardGeneralTitle: string;
        infoId: string;
        infoCategory: string;
        infoClubType: string;
        infoLevel: string;
        infoRequirements: string;
        infoMaterial: string;
        openMaterial: string;
        downloadMaterial: string;
        cardDescriptionTitle: string;
        noDescription: string;
      };
      edit: {
        title: string;
        description: string;
        backButton: string;
      };
      requirements: {
        title: string;
        addButton: string;
        backButton: string;
        errorTitle: string;
        retryButton: string;
        invalidIdError: string;
      };
      requirementsReview: {
        title: string;
        description: string;
        backToList: string;
        reviewItemTitle: string;
        pendingBadge: string;
        filterAllHonors: string;
        filterAllCategories: string;
        perPage: string;
        pageOf: string;
        showing: string;
        selectedCount: string;
        selectedCountPlural: string;
        approveSelected: string;
        rejectSelected: string;
        selectAll: string;
        selectRequirement: string;
        prevPage: string;
        nextPage: string;
        colHonor: string;
        colLabel: string;
        colText: string;
        colActions: string;
        reviewButton: string;
        emptyTitle: string;
        emptyDescription: string;
        errorTitle: string;
        retryButton: string;
        batchError: string;
        loadError: string;
      };
    };
  };
  honor_categories: {
    errors: {
      no_permission_create: string;
      no_permission_update: string;
      no_permission_delete: string;
      create_failed: string;
      update_failed: string;
      delete_failed: string;
    };
    validation: {
      name_required: string;
      no_changes: string;
      category_not_identified_update: string;
      category_not_identified_delete: string;
    };
  };
  rbac: {
    errors: {
      create_permission_failed: string;
      update_permission_failed: string;
      create_role_failed: string;
      update_role_failed: string;
      deactivate_role_failed: string;
      sync_permissions_failed: string;
      assign_role_failed: string;
      remove_role_failed: string;
      assign_permission_failed: string;
      remove_permission_failed: string;
      load_user_permissions_failed: string;
    };
    validation: {
      permission_name_required: string;
      permission_name_format: string;
      role_name_required: string;
      role_name_format: string;
      role_name_reserved: string;
      description_min_length: string;
      description_max_length: string;
      role_category_invalid: string;
      role_required: string;
      permission_required: string;
      user_id_required: string;
      uuid_invalid: string;
    };
    success: {
      permissions_updated: string;
    };
    toasts: {
      role_assigned: string;
      role_removed: string;
      permission_assigned: string;
      permission_removed: string;
      role_deactivated: string;
    };
    roleForm: {
      generalInfo: string;
      generalInfoDesc: string;
      editGeneralInfoDesc: string;
      roleName: string;
      roleNamePlaceholder: string;
      roleNameTitle: string;
      roleNameHint: string;
      roleNameImmutableTooltip: string;
      category: string;
      categoryGlobal: string;
      categoryClub: string;
      categoryImmutableTooltip: string;
      description: string;
      descriptionPlaceholder: string;
      descriptionHint: string;
      permissions: string;
      permissionsDesc: string;
      editPermissionsDesc: string;
      cancel: string;
      creating: string;
      createRole: string;
      saving: string;
      saveChanges: string;
    };
    permissionsTable: {
      createPermission: string;
      emptyTitle: string;
      emptyDescription: string;
      colId: string;
      colKey: string;
      colDescription: string;
      colStatus: string;
      colActions: string;
      statusActive: string;
      statusInactive: string;
      actionEdit: string;
      actionDelete: string;
      mobileListLabel: string;
      editAriaLabel: string;
      deleteAriaLabel: string;
      createDialogTitle: string;
      createDialogDesc: string;
      editDialogTitle: string;
      deleteDialogTitle: string;
      deleteDialogDescPre: string;
      deleteDialogDescPost: string;
      fieldPermissionKey: string;
      fieldPermissionKeyPlaceholder: string;
      fieldDescription: string;
      fieldDescriptionPlaceholder: string;
      fieldActive: string;
      cancel: string;
      create: string;
      saveChanges: string;
      delete: string;
    };
    permissionPicker: {
      searchPlaceholder: string;
      ofLabel: string;
      selectedLabel: string;
      noMatches: string;
      selectAllInGroup: string;
      destructiveAction: string;
    };
    userRolesPanel: {
      title: string;
      subtitle: string;
      assignRole: string;
      emptyState: string;
      removeRoleTitle: string;
      removeSrOnly: string;
      assignDialogTitle: string;
      assignDialogDesc: string;
      searchPlaceholder: string;
      noMatchingRoles: string;
      noAvailableRoles: string;
      categoryLabel: string;
      cancel: string;
      removeDialogTitle: string;
      removeDialogDescPre: string;
      removeDialogDescPost: string;
      remove: string;
    };
    pages: {
      root: {
        title: string;
        description: string;
        sectionPermissions: string;
        sectionPermissionsDesc: string;
        sectionRoles: string;
        sectionRolesDesc: string;
        sectionUserPermissions: string;
        sectionUserPermissionsDesc: string;
        sectionMatrix: string;
        sectionMatrixDesc: string;
      };
      matrix: {
        title: string;
        description: string;
        emptyTitle: string;
        emptyDescription: string;
        loadError: string;
      };
      permissions: {
        title: string;
        description: string;
        loadError: string;
        emptyLoadTitle: string;
      };
      userPermissions: {
        title: string;
        description: string;
        loadError: string;
        emptyLoadTitle: string;
      };
      roles: {
        title: string;
        description: string;
        newRole: string;
        loadError: string;
        emptyLoadTitle: string;
        emptyTitle: string;
        emptyDescription: string;
      };
      rolesNew: {
        title: string;
        description: string;
        backAriaLabel: string;
        loadError: string;
      };
      rolesDetail: {
        backAriaLabel: string;
        editTitle: string;
        editTitleFallback: string;
        description: string;
        loadError: string;
        emptyLoadTitle: string;
      };
    };
    permissionGroups: {
      users: string;
      roles: string;
      clubs: string;
      units: string;
      member_of_month: string;
      scoring_categories: string;
      requests: string;
      user_certifications: string;
      user_folders: string;
      geography: string;
      catalogs: string;
      classes_honors: string;
      activities: string;
      camporees: string;
      validation: string;
      finances: string;
      inventory: string;
      reports: string;
      notifications: string;
      resources: string;
      system: string;
    };
    permissions: {
      "users:read": string;
      "users:read_detail": string;
      "users:update_profile": string;
      "users:update_admin": string;
      "health:read": string;
      "health:update": string;
      "emergency_contacts:read": string;
      "emergency_contacts:update": string;
      "legal_representative:read": string;
      "legal_representative:update": string;
      "post_registration:read": string;
      "registration:complete": string;
      "roles:read": string;
      "permissions:read": string;
      "permissions:assign": string;
      "clubs:read": string;
      "clubs:create": string;
      "clubs:update": string;
      "clubs:delete": string;
      "club_sections:read": string;
      "club_sections:create": string;
      "club_sections:update": string;
      "club_roles:read": string;
      "club_roles:assign": string;
      "club_roles:revoke": string;
      "club_members:approve": string;
      "club_members:reject": string;
      "club_members:list_pending": string;
      "units:read": string;
      "mom:read": string;
      "mom:supervise": string;
      "mom:evaluate": string;
      "scoring_categories:read": string;
      "scoring_categories:manage": string;
      "requests:read": string;
      "requests:review": string;
      "user_certifications:read": string;
      "user_certifications:manage": string;
      "user_folders:read": string;
      "user_folders:manage": string;
      "achievements:read": string;
      "achievements:manage": string;
      "rankings:read": string;
      "rankings:recalculate": string;
      "ranking_weights:read": string;
      "ranking_weights:write": string;
      "member_rankings:read_self": string;
      "member_rankings:read_section": string;
      "member_rankings:read_club": string;
      "member_rankings:read_lf": string;
      "member_rankings:read_global": string;
      "member_ranking_weights:read": string;
      "member_ranking_weights:write": string;
      "section_rankings:read_club": string;
      "section_rankings:read_lf": string;
      "section_rankings:read_global": string;
      "award_categories:create": string;
      "award_categories:read": string;
      "award_categories:update": string;
      "award_categories:delete": string;
      "countries:read": string;
      "countries:create": string;
      "countries:update": string;
      "countries:delete": string;
      "unions:read": string;
      "unions:create": string;
      "unions:update": string;
      "unions:delete": string;
      "local_fields:read": string;
      "local_fields:create": string;
      "local_fields:update": string;
      "local_fields:delete": string;
      "churches:read": string;
      "churches:create": string;
      "churches:update": string;
      "churches:delete": string;
      "catalogs:read": string;
      "catalogs:create": string;
      "catalogs:update": string;
      "catalogs:delete": string;
      "classes:read": string;
      "classes:submit_progress": string;
      "classes:manage": string;
      "class_modules:manage": string;
      "class_sections:manage": string;
      "honors:read": string;
      "honors:create": string;
      "honors:update": string;
      "honors:delete": string;
      "master_honors:manage": string;
      "user_honors:submit": string;
      "user_honors:validate": string;
      "honor_categories:read": string;
      "honor_categories:create": string;
      "honor_categories:update": string;
      "honor_categories:delete": string;
      "folders:manage": string;
      "folder_modules:manage": string;
      "folder_sections:manage": string;
      "finance_categories:manage": string;
      "inventory_categories:manage": string;
      "activities:read": string;
      "activities:create": string;
      "activities:update": string;
      "activities:delete": string;
      "attendance:read": string;
      "attendance:manage": string;
      "camporees:read": string;
      "camporees:create": string;
      "camporees:update": string;
      "camporees:delete": string;
      "validation:submit": string;
      "validation:review": string;
      "validation:read": string;
      "finances:read": string;
      "finances:create": string;
      "finances:update": string;
      "finances:delete": string;
      "inventory:read": string;
      "inventory:create": string;
      "inventory:update": string;
      "inventory:delete": string;
      "notifications:send": string;
      "notifications:broadcast": string;
      "notifications:club": string;
      "reports:read": string;
      "reports:download": string;
      "dashboard:view": string;
      "resources:read": string;
      "resources:create": string;
      "resources:update": string;
      "resources:delete": string;
      "resource_categories:read": string;
      "resource_categories:create": string;
      "resource_categories:update": string;
      "resource_categories:delete": string;
      "ecclesiastical_years:read": string;
      "ecclesiastical_years:create": string;
      "ecclesiastical_years:update": string;
    };
    userPermissionsPanel: {
      title: string;
      subtitle: string;
      addPermission: string;
      noPermissionsTitle: string;
      addDirectPermission: string;
      addDialogTitle: string;
      addDialogDescription: string;
      searchPlaceholder: string;
      noMatchesSearch: string;
      noPermissionsAvailable: string;
      cancelButton: string;
      assignButton: string;
      removePermission: string;
      removeSrOnly: string;
      removeDialogTitle: string;
      removeDialogDescription: string;
      removeCancel: string;
      removeConfirm: string;
    };
  };
  resource_categories: {
    errors: {
      no_permission_create: string;
      no_permission_update: string;
      no_permission_delete: string;
      create_failed: string;
      update_failed: string;
      delete_failed: string;
    };
    validation: {
      name_required: string;
      category_not_identified_update: string;
      category_not_identified_delete: string;
    };
  };
  achievements: {
    errors: {
      create_category_failed: string;
      update_category_failed: string;
      delete_category_failed: string;
      create_achievement_failed: string;
      update_achievement_failed: string;
      delete_achievement_failed: string;
    };
    validation: {
      category_name_required: string;
      category_edit_not_identified: string;
      category_delete_not_identified: string;
      achievement_name_required: string;
      type_required: string;
      tier_required: string;
      scope_required: string;
      points_positive: string;
      criteria_invalid: string;
      achievement_edit_not_identified: string;
      achievement_delete_not_identified: string;
    };
    pages: {
      list: {
        loadError: string;
      };
      detail: {
        missingCategory: string;
        loadError: string;
        defaultCategoryName: string;
      };
      detailNew: {
        title: string;
        descriptionTemplate: string;
        breadcrumbRoot: string;
        breadcrumbNew: string;
        loadError: string;
        defaultName: string;
        defaultCategoryName: string;
      };
      detailEdit: {
        title: string;
        breadcrumbRoot: string;
        loadError: string;
        defaultName: string;
        defaultCategoryName: string;
        defaultAchievementName: string;
      };
    };
    imageUpload: {
      dropzoneAriaLabel: string;
      uploading: string;
      dropzonePrompt: string;
      dropzoneHint: string;
      previewAlt: string;
      previewTitle: string;
      tierLabel: string;
      noImageLabel: string;
      removeAriaLabel: string;
      toastSuccess: string;
      toastError: string;
      toastSaveFirst: string;
      validateTypeError: string;
      validateSizeError: string;
    };
    cards: {
      preview: {
        tierLabels: {
          BRONZE: string;
          SILVER: string;
          GOLD: string;
          PLATINUM: string;
          DIAMOND: string;
        };
        typeLabels: {
          THRESHOLD: string;
          STREAK: string;
          MILESTONE: string;
          COLLECTION: string;
          COMPOUND: string;
        };
        repeatableBadge: string;
        secretBadge: string;
        pointsSuffix: string;
        defaultName: string;
      };
    };
    forms: {
      category: {
        titleCreate: string;
        titleEdit: string;
        descriptionCreate: string;
        descriptionEdit: string;
        labelName: string;
        placeholderName: string;
        labelDescription: string;
        placeholderDescription: string;
        labelIcon: string;
        placeholderIcon: string;
        labelIconHint: string;
        labelOrder: string;
        placeholderOrder: string;
        labelActive: string;
        cancelButton: string;
        submitCreate: string;
        submitEdit: string;
      };
      achievement: {
        tabBasic: string;
        tabCriteria: string;
        tabMedia: string;
        labelName: string;
        placeholderName: string;
        labelDescription: string;
        placeholderDescription: string;
        labelPoints: string;
        labelTier: string;
        placeholderTier: string;
        labelType: string;
        placeholderType: string;
        labelScope: string;
        placeholderScope: string;
        labelCategory: string;
        placeholderCategory: string;
        labelPrerequisite: string;
        placeholderPrerequisite: string;
        labelRepeatable: string;
        labelMaxRepeats: string;
        labelSecret: string;
        labelActive: string;
        labelPreview: string;
        cancelButton: string;
        submitCreate: string;
        submitEdit: string;
        scopeLabels: {
          CLUB: string;
          SECTION: string;
          INDIVIDUAL: string;
          GLOBAL: string;
          CLUB_TYPE: string;
          ECCLESIASTICAL_YEAR: string;
        };
        defaultName: string;
        tierLabels: {
          BRONZE: string;
          SILVER: string;
          GOLD: string;
          PLATINUM: string;
          DIAMOND: string;
        };
        typeLabels: {
          THRESHOLD: string;
          STREAK: string;
          COMPOUND: string;
          MILESTONE: string;
          COLLECTION: string;
        };
      };
      criteria: {
        typeDescriptions: {
          THRESHOLD: string;
          STREAK: string;
          MILESTONE: string;
          COLLECTION: string;
          COMPOUND: string;
        };
        labelEvent: string;
        placeholderEvent: string;
        labelField: string;
        placeholderField: string;
        labelTarget: string;
        labelTargetValue: string;
        placeholderTargetValue: string;
        labelOperator: string;
        placeholderOperator: string;
        labelStreakTarget: string;
        labelUnit: string;
        placeholderUnit: string;
        labelGrace: string;
        labelGraceHint: string;
        labelDistinctField: string;
        placeholderDistinctField: string;
        labelQuantityTarget: string;
        labelLogic: string;
        logicAnd: string;
        logicOr: string;
        conditionLabel: string;
        addConditionButton: string;
        eventLabels: {
          CLASS_COMPLETED: string;
          HONOR_EARNED: string;
          INVESTITURE_ACHIEVED: string;
          CAMPOREE_ATTENDED: string;
          MEETING_ATTENDED: string;
          ACTIVITY_COMPLETED: string;
          REPORT_SUBMITTED: string;
          POINTS_EARNED: string;
          activity_attendance: string;
          honor_completed: string;
          class_completed: string;
          investiture_completed: string;
          camporee_attended: string;
          evidence_submitted: string;
          evidence_approved: string;
          consecutive_attendance: string;
          profile_completed: string;
          club_role_assigned: string;
        };
        operatorLabels: {
          gt: string;
          gte: string;
          lt: string;
          lte: string;
          eq: string;
          ne: string;
        };
        streakUnitLabels: {
          day: string;
          week: string;
          month: string;
        };
      };
    };
    crud: {
      list: {
        page: string;
        pageDescription: string;
        breadcrumbRoot: string;
        newButton: string;
        filtersTitle: string;
        filterName: string;
        filterNamePlaceholder: string;
        search: string;
        filterTier: string;
        filterTierPlaceholder: string;
        filterTierAll: string;
        filterType: string;
        filterTypePlaceholder: string;
        filterTypeAll: string;
        filterStatus: string;
        filterStatusPlaceholder: string;
        filterStatusAll: string;
        filterStatusActive: string;
        filterStatusInactive: string;
        tableColName: string;
        tableColTier: string;
        tableColType: string;
        tableColPoints: string;
        tableColScope: string;
        tableColSecret: string;
        tableColStatus: string;
        tableColActions: string;
        ariaRepeatable: string;
        ariaSecret: string;
        ariaVisible: string;
        statusActive: string;
        statusInactive: string;
        active: string;
        tier: string;
        type: string;
        emptyNoFiltersTitle: string;
        emptyNoFiltersDescription: string;
        emptyFiltersTitle: string;
        emptyFiltersDescription: string;
        deleteTitle: string;
        deleteDescription: string;
        deleteCancelButton: string;
        deleteConfirmButton: string;
        actionEdit: string;
        actionDelete: string;
      };
      categories: {
        pageTitle: string;
        page: string;
        pageDescription: string;
        newButton: string;
        filtersTitle: string;
        filtersSubtitle: string;
        filterName: string;
        filterNamePlaceholder: string;
        search: string;
        q: string;
        filterStatus: string;
        filterStatusPlaceholder: string;
        filterStatusAll: string;
        filterStatusActive: string;
        filterStatusInactive: string;
        tableColName: string;
        tableColDescription: string;
        tableColIcon: string;
        tableColOrder: string;
        tableColStatus: string;
        tableColActions: string;
        statusActive: string;
        statusInactive: string;
        active: string;
        emptyNoFiltersTitle: string;
        emptyNoFiltersDescription: string;
        emptyFiltersTitle: string;
        emptyFiltersDescription: string;
        deleteTitle: string;
        deleteDescription: string;
        deleteCancelButton: string;
        deleteConfirmButton: string;
        actionEdit: string;
        actionDelete: string;
      };
    };
  };
  camporees: {
    toasts: {
      payment_updated: string;
      payment_created: string;
      camporee_deleted: string;
      union_camporee_updated: string;
      union_camporee_created: string;
      union_camporee_deleted: string;
      member_registered: string;
      camporee_updated: string;
      camporee_created: string;
      club_enrolled: string;
    };
    errors: {
      save_payment: string;
      load_list: string;
      approve_club: string;
      delete_camporee: string;
      save_camporee: string;
      register_member: string;
      unexpected: string;
      approve_member: string;
      approve_payment: string;
      enroll_club: string;
      create_failed: string;
      update_failed: string;
      register_member_failed: string;
      remove_member_failed: string;
    };
    list: {
      countSingular: string;
      countPlural: string;
      refresh: string;
      newCamporee: string;
      loading: string;
      emptyTitle: string;
      emptyDescription: string;
      colName: string;
      colStartDate: string;
      colEndDate: string;
      colPlace: string;
      colStatus: string;
      statusActive: string;
      statusInactive: string;
      deleteTitle: string;
      deleteLabel: string;
      viewDetail: string;
    };
    form: {
      titleCreate: string;
      titleEdit: string;
      labelName: string;
      placeholderName: string;
      labelDescription: string;
      placeholderDescription: string;
      labelStartDate: string;
      labelEndDate: string;
      labelPlace: string;
      placeholderPlace: string;
      labelLocalFieldId: string;
      labelRegistrationCost: string;
      labelIncludes: string;
      adventurers: string;
      pathfinders: string;
      masterGuides: string;
      cancel: string;
      saving: string;
      creating: string;
      saveChanges: string;
      createCamporee: string;
    };
    unionList: {
      countSingular: string;
      countPlural: string;
      refresh: string;
      newCamporee: string;
      loading: string;
      emptyTitle: string;
      emptyDescription: string;
      colName: string;
      colUnion: string;
      colStartDate: string;
      colEndDate: string;
      colPlace: string;
      colStatus: string;
      statusActive: string;
      statusInactive: string;
      editTitle: string;
      editLabel: string;
      deleteTitle: string;
      deleteLabel: string;
    };
    unionForm: {
      titleCreate: string;
      titleEdit: string;
      labelName: string;
      placeholderName: string;
      labelDescription: string;
      placeholderDescription: string;
      labelStartDate: string;
      labelEndDate: string;
      labelUnion: string;
      placeholderUnion: string;
      labelPlace: string;
      placeholderPlace: string;
      labelRegistrationCost: string;
      labelIncludes: string;
      adventurers: string;
      pathfinders: string;
      masterGuides: string;
      cancel: string;
      saving: string;
      creating: string;
      saveChanges: string;
      createCamporee: string;
    };
    clubsPanel: {
      emptyTitle: string;
      emptyDescription: string;
      colSection: string;
      colStatus: string;
      colRegisteredBy: string;
      colDate: string;
      statusActive: string;
      statusApproved: string;
      statusPending: string;
      statusRejected: string;
      statusCancelled: string;
      fallbackSection: string;
      fallbackClub: string;
      approveLabel: string;
      rejectLabel: string;
      cancelLabel: string;
      approvedWithName: string;
      approvedGeneric: string;
      cancelledWithName: string;
      cancelledGeneric: string;
      errorCancel: string;
      entityLabel: string;
    };
    membersPanel: {
      emptyTitle: string;
      emptyDescription: string;
      colMember: string;
      colClub: string;
      colStatus: string;
      colType: string;
      colInsurance: string;
      statusRegistered: string;
      statusApproved: string;
      statusPending: string;
      statusRejected: string;
      statusCancelled: string;
      insuranceNone: string;
      insuranceVerified: string;
      insurancePending: string;
      typeLocal: string;
      typeUnion: string;
      fallbackMember: string;
      approveLabel: string;
      rejectLabel: string;
      removeLabel: string;
      approvedWithName: string;
      approvedGeneric: string;
      removedWithName: string;
      removedGeneric: string;
      errorRemove: string;
      errorNoMemberId: string;
      entityLabel: string;
    };
    paymentsPanel: {
      emptyTitle: string;
      emptyDescription: string;
      summaryTotal: string;
      paymentTypeInscription: string;
      paymentTypeMaterials: string;
      paymentTypeOther: string;
      colMember: string;
      colAmount: string;
      colType: string;
      colStatus: string;
      colReference: string;
      colDate: string;
      statusApproved: string;
      statusPending: string;
      statusRejected: string;
      approveLabel: string;
      rejectLabel: string;
      editLabel: string;
      approvedWithName: string;
      approvedGeneric: string;
      errorNoPaymentUuid: string;
      fallbackPayment: string;
      entityLabel: string;
    };
    enrollDialog: {
      title: string;
      labelSectionId: string;
      placeholderSectionId: string;
      helpSectionId: string;
      cancel: string;
      enrolling: string;
      enroll: string;
    };
    paymentDialog: {
      titleCreate: string;
      titleEdit: string;
      labelMember: string;
      placeholderMember: string;
      labelAmount: string;
      labelPaymentType: string;
      placeholderPaymentType: string;
      paymentTypeInscription: string;
      paymentTypeMaterials: string;
      paymentTypeOther: string;
      labelReference: string;
      placeholderReference: string;
      labelPaidAt: string;
      labelNotes: string;
      placeholderNotes: string;
      cancel: string;
      saving: string;
      registering: string;
      saveChanges: string;
      registerPayment: string;
    };
    registerMemberDialog: {
      title: string;
      insuranceErrorTitle: string;
      labelUserId: string;
      labelCamporeeType: string;
      placeholderCamporeeType: string;
      typeLocal: string;
      typeUnion: string;
      labelClubName: string;
      clubNameRequiredForUnion: string;
      placeholderClubName: string;
      labelInsuranceId: string;
      placeholderInsuranceId: string;
      helpInsurance: string;
      cancel: string;
      registering: string;
      register: string;
    };
    pages: {
      list: {
        title: string;
        description: string;
        viewUnion: string;
        loadFailed: string;
        emptyTitle: string;
      };
      detail: {
        description: string;
        back: string;
        cardTitle: string;
        labelId: string;
        labelStartDate: string;
        labelEndDate: string;
        labelPlace: string;
        labelCost: string;
        labelLocalFieldId: string;
        labelIncludes: string;
        labelDescription: string;
        loadFailed: string;
        loadClubsFailed: string;
        loadPaymentsFailed: string;
      };
      union: {
        title: string;
        description: string;
        loadFailed: string;
        pageFailed: string;
        emptyTitle: string;
      };
    };
    validation: {
      member_required: string;
      amount_positive: string;
      name_required: string;
      start_date_required: string;
      end_date_required: string;
      union_required: string;
      place_required: string;
      local_field_required: string;
      end_date_after_start: string;
      end_date_after_start_full: string;
      field_required: string;
      field_invalid: string;
      dates_required: string;
      no_changes: string;
      user_id_required: string;
      camporee_type_invalid: string;
      insurance_invalid: string;
      member_remove_not_identified: string;
    };
    fields: {
      local_field: string;
    };
    success: {
      member_registered: string;
      member_removed: string;
    };
  };
  resources: {
    errors: {
      create_permission_denied: string;
      update_permission_denied: string;
      delete_permission_denied: string;
      create_failed: string;
      update_failed: string;
      delete_failed: string;
      update_not_found: string;
      delete_not_found: string;
    };
    validation: {
      title_required: string;
      resource_type_required: string;
      video_url_required: string;
      content_required: string;
    };
    toasts: {
      download_link_failed: string;
    };
    categoriesCrud: {
      pageTitle: string;
      pageDescription: string;
      createCategory: string;
      filtersTitle: string;
      filtersSubtitle: string;
      filterName: string;
      filterNamePlaceholder: string;
      filterStatus: string;
      statusAll: string;
      statusActive: string;
      statusInactive: string;
      noResults: string;
      noResultsDesc: string;
      emptyTitle: string;
      emptyDesc: string;
      colName: string;
      colDescription: string;
      colStatus: string;
      colActions: string;
      fieldName: string;
      fieldNamePlaceholder: string;
      fieldDescription: string;
      fieldDescriptionPlaceholder: string;
      fieldActive: string;
      createDialogTitle: string;
      createDialogDesc: string;
      editDialogTitle: string;
      deleteDialogTitle: string;
      deleteDialogDesc: string;
      edit: string;
      delete: string;
      cancel: string;
      createSubmit: string;
      saveChanges: string;
      noPermissions: string;
    };
    pages: {
      list: {
        forbiddenDetail: string;
      };
      categories: {
        forbiddenDetail: string;
      };
    };
    placeholders: {
      title: string;
      description: string;
      selectType: string;
      selectCategory: string;
      selectClubType: string;
      selectScope: string;
      selectUnion: string;
      unionId: string;
      selectLocalField: string;
      localFieldId: string;
      videoUrl: string;
      content: string;
      searchTitle: string;
      filterType: string;
      filterStatus: string;
      filterScope: string;
      filterClubType: string;
    };
  };
  investiture: {
    bulk: {
      errors: {
        approve_failed: string;
        reject_failed: string;
      };
      validation: {
        reason_required: string;
        reason_max: string;
      };
      toasts: {
        verb_approved: string;
        verb_rejected: string;
        succeeded_count: string;
        failed_count: string;
      };
    };
    toasts: {
      approved: string;
      invested: string;
      config_updated: string;
      config_created: string;
      config_deactivated: string;
      catalogs_load_failed: string;
      invested_member: string;
      rejected_member: string;
      validation_approved: string;
      validation_rejected: string;
    };
    errors: {
      approve: string;
      invest: string;
      config_update: string;
      config_create: string;
      config_deactivate: string;
      unexpected: string;
    };
    validation: {
      local_field_required: string;
      year_required: string;
      submission_deadline_required: string;
      investiture_date_required: string;
      comments_required: string;
      reason_required: string;
    };
    configClient: {
      countSingular: string;
      countPlural: string;
      refresh: string;
      newConfig: string;
      errorRefresh: string;
    };
    configTable: {
      emptyTitle: string;
      emptyDescription: string;
      colLocalField: string;
      colYear: string;
      colSubmissionDeadline: string;
      colInvestitureDate: string;
      colStatus: string;
      colActions: string;
      statusActive: string;
      statusInactive: string;
      tooltipEdit: string;
      tooltipDeactivate: string;
      tooltipAlreadyInactive: string;
      ariaEdit: string;
      ariaDeactivate: string;
      fieldFallback: string;
      yearFallback: string;
    };
    client: {
      allYears: string;
      yearActive: string;
      countSingular: string;
      countPlural: string;
      refresh: string;
      errorRefresh: string;
    };
    pipeline: {
      refresh: string;
      errorRefresh: string;
      tabAll: string;
      tabSubmitted: string;
      tabClubApproved: string;
      tabCoordinatorApproved: string;
      tabFieldApproved: string;
      tabInvested: string;
      tabRejected: string;
    };
    historyDialog: {
      title: string;
      errorLoad: string;
      emptyHistory: string;
      system: string;
      actionSubmitted: string;
      actionClubApproved: string;
      actionCoordinatorApproved: string;
      actionFieldApproved: string;
      actionInvested: string;
      actionRejected: string;
    };
    history: {
      emptyHistory: string;
      system: string;
      actionSubmitted: string;
      actionApproved: string;
      actionRejected: string;
      actionReinvestitureRequested: string;
    };
    pendingTable: {
      emptyTitle: string;
      emptyDescription: string;
      colMember: string;
      colClass: string;
      colClub: string;
      colSubmitted: string;
      colStatus: string;
      colActions: string;
      ariaHistory: string;
      ariaApprove: string;
      ariaReject: string;
      ariaMarkInvested: string;
      tooltipHistory: string;
      tooltipApprove: string;
      tooltipReject: string;
      tooltipMarkInvested: string;
      historyTitle: string;
      errorLoadHistory: string;
      enrollmentFallback: string;
    };
    statusBadge: {
      inProgress: string;
      submittedForValidation: string;
      submitted: string;
      clubApproved: string;
      coordinatorApproved: string;
      fieldApproved: string;
      approved: string;
      rejected: string;
      invested: string;
    };
    pipelineStatusBadge: {
      submitted: string;
      clubApproved: string;
      coordinatorApproved: string;
      fieldApproved: string;
      invested: string;
      rejected: string;
    };
    page: {
      title: string;
      description: string;
      errorFallback: string;
      emptyTitle: string;
      emptyDescription: string;
    };
    pageConfig: {
      title: string;
      description: string;
      errorFallback: string;
    };
    pagePipeline: {
      title: string;
      description: string;
      errorFallback: string;
      emptyTitle: string;
      emptyDescription: string;
    };
    investidoDialog: {
      title: string;
      description: string;
      commentsLabel: string;
      commentsPlaceholder: string;
      cancel: string;
      confirm: string;
    };
    pipelineRejectDialog: {
      title: string;
      description: string;
      reasonLabel: string;
      reasonPlaceholder: string;
      cancel: string;
      confirm: string;
    };
  };
  evidence_review: {
    bulk: {
      toasts: {
        verb_approved: string;
        verb_rejected: string;
        succeeded_count: string;
        failed_count: string;
      };
      errors: {
        approve_failed: string;
        reject_failed: string;
      };
      validation: {
        reason_required: string;
        reason_max: string;
      };
    };
    toasts: {
      evidence_approved: string;
      evidence_rejected: string;
    };
    errors: {
      approve: string;
      reject: string;
      load_detail_failed: string;
    };
    validation: {
      reason_required: string;
      reason_max: string;
    };
    table: {
      col_member: string;
      col_type: string;
      col_section: string;
      col_files: string;
      col_submitted: string;
      col_status: string;
      col_actions: string;
      select_all: string;
      select_row: string;
      action_view_files: string;
      action_view_history: string;
      action_approve: string;
      action_reject: string;
      empty_title: string;
      empty_description: string;
    };
    typeBadge: {
      folder: string;
      class: string;
      honor: string;
    };
    statusBadge: {
      no_submit: string;
      submitted: string;
      validated: string;
      rejected: string;
    };
    client: {
      tab_all: string;
      tab_folders: string;
      tab_classes: string;
      tab_honors: string;
      btn_refresh: string;
      error_refresh: string;
    };
    history: {
      title: string;
      empty: string;
      system: string;
      action_approved: string;
      action_rejected: string;
      action_submitted: string;
      error_load: string;
    };
    page: {
      title: string;
      description: string;
      errorLoad: string;
      emptyTitle: string;
      emptyDescription: string;
      allReviewed: string;
    };
    rejectDialog: {
      title: string;
      description: string;
      reasonLabel: string;
      reasonPlaceholder: string;
      cancel: string;
      confirm: string;
    };
  };
  users: {
    toasts: {
      access_updated: string;
      access_update_failed: string;
      approval_updated: string;
      approval_update_failed: string;
      mfa_reset: string;
      mfa_reset_failed: string;
      mfa_disabled: string;
      mfa_disable_failed: string;
      session_revoked: string;
      session_revoke_failed: string;
      all_sessions_revoked: string;
      all_sessions_revoke_failed: string;
    };
    errors: {
      mfa_reset_description: string;
      mfa_disable_description: string;
    };
    list: {
      ariaLabel: string;
      columns: {
        user: string;
        roles: string;
        location: string;
        status: string;
        access: string;
        postRegistration: string;
        registrationDate: string;
      };
      fields: {
        location: string;
        registrationDate: string;
      };
      status: {
        active: string;
        inactive: string;
      };
      postReg: {
        complete: string;
        pending: string;
        completeDesktop: string;
      };
      noRole: string;
    };
    filters: {
      searchPlaceholder: string;
      rolePlaceholder: string;
      allRoles: string;
      roleOptions: {
        superAdmin: string;
        admin: string;
        coordinator: string;
      };
      statusPlaceholder: string;
      statusAll: string;
      statusActive: string;
      statusInactive: string;
      scopeLabel: string;
    };
    approval: {
      statusApproved: string;
      statusRejected: string;
      statusUnknown: string;
      actionApprove: string;
      actionReject: string;
      dialogApproveTitle: string;
      dialogRejectTitle: string;
      dialogApproveDescription: string;
      dialogRejectDescription: string;
      rejectReasonLabel: string;
      rejectReasonPlaceholder: string;
      cancelButton: string;
    };
    mfa: {
      status_enabled: string;
      status_not_configured: string;
      not_configured_title: string;
      not_configured_description: string;
      card_title: string;
      status_label: string;
      status_description: string;
      method_label: string;
      method_description: string;
      admin_actions_title: string;
      admin_actions_description: string;
      reset_button: string;
      reset_dialog_title: string;
      reset_dialog_body1: string;
      reset_dialog_body2: string;
      reset_toast_description: string;
      reset_confirming: string;
      reset_confirm: string;
      disable_button: string;
      disable_dialog_title: string;
      disable_dialog_body1: string;
      disable_dialog_body2: string;
      disable_toast_description: string;
      disable_confirming: string;
      disable_confirm: string;
      cancel: string;
    };
    sessions: {
      card_title: string;
      session_count_one: string;
      session_count_other: string;
      refresh_title: string;
      revoke_all_button: string;
      revoke_all_dialog_title: string;
      revoke_all_dialog_description: string;
      revoke_all_confirm: string;
      revoke_session_title: string;
      revoke_dialog_title: string;
      revoke_dialog_description: string;
      revoke_confirm: string;
      cancel: string;
      current_session_label: string;
      status_active: string;
      device_on_os: string;
      unknown: string;
      ip_unknown: string;
      empty_title: string;
      empty_description: string;
      error_title: string;
      error_description: string;
      retry: string;
      col_device: string;
      col_ip: string;
      col_expires: string;
      col_created: string;
      col_status: string;
      relative_now: string;
      relative_minutes: string;
      relative_hours: string;
      relative_days: string;
    };
    access: {
      card_title: string;
      access_app_label: string;
      access_panel_label: string;
      active_label: string;
      approval_label: string;
      approval_pending: string;
      approval_approved: string;
      approval_rejected: string;
    };
    postRegistration: {
      status_card_title: string;
      status_complete: string;
      status_in_progress: string;
      badge_complete: string;
      badge_pending: string;
      steps_card_title: string;
      step_label: string;
      step_label_full: string;
      step_status_complete: string;
      step_status_pending: string;
      step_status_optional: string;
      step_aria_complete: string;
      step_aria_pending: string;
      step_aria_optional: string;
      force_complete_button: string;
      force_dialog_title: string;
      force_dialog_description: string;
      force_dialog_detail: string;
      force_confirming: string;
      cancel: string;
      step3_note: string;
      photo_card_title: string;
      photo_has_label: string;
      photo_none_label: string;
      photo_has_description: string;
      photo_none_description: string;
      photo_badge_has: string;
      photo_badge_none: string;
      photo_aria_has: string;
      photo_aria_none: string;
      readonly_notice: string;
      step1_label: string;
      step1_description: string;
      step1_req1: string;
      step2_label: string;
      step2_description: string;
      step2_req1: string;
      step2_req2: string;
      step2_req3: string;
      step2_req4: string;
      step2_req5: string;
      step3_label: string;
      step3_description: string;
      step3_req1: string;
      step3_req2: string;
      step3_req3: string;
    };
    pages: {
      list: {
        title: string;
        description: string;
        cannotShow: string;
        emptyTitle: string;
        emptyDescription: string;
      };
      detail: {
        title: string;
        back: string;
        restrictedTitle: string;
        restrictedDescription: string;
        statusActive: string;
        statusInactive: string;
        tabInfo: string;
        tabPostRegistration: string;
        tabSecurity: string;
        tabSessions: string;
        postRegistrationUnavailable: string;
      };
    };
  };
  annual_folders: {
    toasts: {
      section_deleted: string;
      section_evaluated: string;
      file_required: string;
      evidence_uploaded: string;
      rankings_recalculated: string;
      section_updated: string;
      section_created: string;
      category_deleted: string;
      evidence_deleted: string;
      folder_submitted: string;
      folder_closed: string;
      section_reopened: string;
      category_updated: string;
      category_created: string;
      template_updated: string;
      template_created: string;
      owner_catalogs_load_failed: string;
    };
    errors: {
      recalculate_rankings: string;
      save_evaluation_failed: string;
      upload_evidence_failed: string;
      save_section_failed: string;
      submit_folder_failed: string;
      close_folder_failed: string;
      save_template_failed: string;
    };
    statusBadge: {
      open: string;
      submitted: string;
      under_evaluation: string;
      evaluated: string;
      closed: string;
    };
    byEnrollment: {
      title: string;
      enrollmentIdLabel: string;
      enrollmentIdPlaceholder: string;
      folderIdLabel: string;
      folderIdPlaceholder: string;
      searchButton: string;
    };
    sectionCard: {
      statusPending: string;
      statusSubmitted: string;
      statusPreapproved: string;
      statusValidated: string;
      statusRejected: string;
      unionRejection: string;
      actorLF: string;
      actorUnion: string;
      pts: string;
    };
    templates: {
      backTitle: string;
      backSrOnly: string;
      sectionSingular: string;
      sectionPlural: string;
      minPointsSuffix: string;
      closingDatePrefix: string;
      addSection: string;
      loadingSections: string;
      noSectionsTitle: string;
      noSectionsDescription: string;
      tableColOrder: string;
      tableColName: string;
      tableColDescription: string;
      tableColRequired: string;
      tableColMaxPts: string;
      tableColMinPts: string;
      tableColActions: string;
      noDescription: string;
      editSection: string;
      deleteSection: string;
      mobileListLabel: string;
      deleteSectionTitle: string;
      deleteSectionDescription: string;
      cancel: string;
      deleteSectionConfirm: string;
      deletingSectionLoading: string;
      countOf: string;
      templateSingular: string;
      templatePlural: string;
      refresh: string;
      newTemplate: string;
      filtersTitle: string;
      clearFilters: string;
      filterByName: string;
      filterByNamePlaceholder: string;
      filterOwnerTierLabel: string;
      filterOwnerTierAll: string;
      filterOwnerTierUnion: string;
      filterOwnerTierLocalField: string;
      noResultsTitle: string;
      noTemplatesTitle: string;
      noResultsDescription: string;
      noTemplatesDescription: string;
      tableColClubType: string;
      tableColEcclesiasticalYear: string;
      tableColOwner: string;
      tableColSections: string;
      tableColStatus: string;
      statusActive: string;
      statusInactive: string;
      editTemplate: string;
      mobileTemplatesLabel: string;
      openTemplateAriaLabel: string;
      errorLoadSections: string;
      errorDeleteSection: string;
      errorRefresh: string;
    };
    templateDialog: {
      titleCreate: string;
      titleEdit: string;
      fieldName: string;
      fieldNamePlaceholder: string;
      fieldClubType: string;
      fieldClubTypePlaceholder: string;
      fieldClubTypeNone: string;
      fieldYear: string;
      fieldYearPlaceholder: string;
      fieldYearNone: string;
      fieldYearActive: string;
      fieldOwner: string;
      fieldOwnerTierUnion: string;
      fieldOwnerTierLocalField: string;
      fieldUnion: string;
      fieldUnionPlaceholder: string;
      fieldUnionNone: string;
      fieldLocalField: string;
      fieldLocalFieldPlaceholder: string;
      fieldLocalFieldNone: string;
      fieldMinPoints: string;
      fieldClosingDate: string;
      fieldLoading: string;
      cancel: string;
      submitCreate: string;
      submitEdit: string;
      submittingCreate: string;
      submittingEdit: string;
    };
    sectionDialog: {
      titleCreate: string;
      titleEdit: string;
      fieldName: string;
      fieldNamePlaceholder: string;
      fieldDescription: string;
      fieldDescriptionPlaceholder: string;
      fieldOrder: string;
      fieldRequired: string;
      fieldRequiredDescription: string;
      fieldMaxPoints: string;
      fieldMinPoints: string;
      cancel: string;
      submitCreate: string;
      submitEdit: string;
      submittingCreate: string;
      submittingEdit: string;
    };
    page: {
      title: string;
      description: string;
      errorFolderFallback: string;
      errorEnrollmentFallback: string;
      emptySelectTitle: string;
      emptySelectDescription: string;
      emptyNotFoundTitle: string;
      emptyNotFoundDescription: string;
    };
    pageCategories: {
      title: string;
      description: string;
      errorFallback: string;
    };
    pageTemplates: {
      title: string;
      description: string;
      errorFallback: string;
    };
    pageEvaluate: {
      title: string;
      description: string;
    };
    pageRankings: {
      title: string;
      description: string;
      errorFallback: string;
      emptyTitle: string;
      emptyDescription: string;
    };
    pageRankingsBreakdown: {
      title: string;
      description: string;
      errorFallback: string;
      paramsRequired: string;
    };
    validation: {
      name_min: string;
      name_max: string;
      description_max: string;
      order_min: string;
      max_points_min: string;
      minimum_points_min: string;
      club_type_required: string;
      ecclesiastical_year_required: string;
      owner_union_required: string;
      owner_local_field_required: string;
      name_min_2: string;
      composite_pct_min: string;
      composite_pct_max: string;
      order_min_0: string;
      composite_pct_invalid: string;
    };
    dialogs: {
      deleteEvidence: {
        title: string;
        description: string;
        confirm: string;
        confirmLoading: string;
        cancel: string;
      };
      sendFolder: {
        title: string;
        description: string;
        confirm: string;
        confirmLoading: string;
        cancel: string;
      };
      closeFolder: {
        title: string;
        description: string;
        confirm: string;
        confirmLoading: string;
        cancel: string;
      };
      deleteCategory: {
        title: string;
        description: string;
        confirm: string;
        confirmLoading: string;
        cancel: string;
      };
      recalculateRankings: {
        title: string;
        description: string;
        confirm: string;
        confirmLoading: string;
        cancel: string;
      };
    };
  };
  folders: {
    toasts: {
      deleted: string;
      updated: string;
      created: string;
    };
    statusBadge: {
      active: string;
      inactive: string;
    };
    management: {
      searchPlaceholder: string;
      refreshButton: string;
      folderCount: string;
      noDescription: string;
      noResultsTitle: string;
      noResultsDescription: string;
      emptyTitle: string;
      emptyDescription: string;
      tableHeaderName: string;
      tableHeaderDescription: string;
      tableHeaderModules: string;
      tableHeaderSections: string;
      tableHeaderStatus: string;
      ariaFolderLink: string;
      ariaList: string;
      modulesLabel: string;
      sectionsLabel: string;
    };
    detail: {
      backButton: string;
      backLabel: string;
      refreshButton: string;
      moduleCount: string;
      sectionCount: string;
      noDescription: string;
      tabStructure: string;
      tabInfo: string;
      noModulesTitle: string;
      noModulesDescription: string;
      tableHeaderModule: string;
      tableHeaderDescription: string;
      tableHeaderOrder: string;
      tableHeaderSections: string;
      sectionsBadge: string;
      noSectionsInModule: string;
      infoId: string;
      infoName: string;
      infoDescription: string;
      infoStatus: string;
      infoModules: string;
      infoTotalSections: string;
      infoCreated: string;
      infoUpdated: string;
    };
    errors: {
      refresh_failed: string;
      folder_refresh_failed: string;
    };
    page: {
      title: string;
      description: string;
      errorLoad: string;
    };
    pageDetail: {
      errorLoad: string;
    };
    validation: {
      name_min: string;
      name_max: string;
      description_max: string;
    };
  };
  validation_admin: {
    errors: {
      unexpected: string;
      loadHistory: string;
      refresh: string;
    };
    status: {
      PENDING: string;
      APPROVED: string;
      REJECTED: string;
      NEEDS_REVISION: string;
    };
    table: {
      columns: {
        member: string;
        class: string;
        honor: string;
        section: string;
        submitted: string;
        status: string;
        actions: string;
      };
      empty: {
        title: string;
        description: string;
      };
      actions: {
        viewHistory: string;
        approve: string;
        reject: string;
      };
    };
    history: {
      title: string;
      empty: string;
      performer: {
        system: string;
      };
      actions: {
        APPROVED: string;
        REJECTED: string;
      };
    };
    client: {
      filters: {
        allSections: string;
      };
      count: string;
      refresh: string;
      tabs: {
        class: string;
        honor: string;
      };
    };
    page: {
      title: string;
      description: string;
      errorLoadClasses: string;
      errorLoadHonors: string;
      errorLoadGeneric: string;
      emptyTitle: string;
      emptyDescription: string;
    };
    validation: {
      comment_required: string;
    };
  };
  scoring_categories: {
    toasts: {
      deleted: string;
    };
    validation: {
      name_required: string;
      name_max: string;
      points_invalid: string;
    };
    errors: {
      status_change_failed: string;
      delete_failed: string;
      save_failed: string;
    };
    table: {
      loadFailed: string;
      retry: string;
      inheritedCount: string;
      ownCount: string;
      newCategory: string;
      emptyTitle: string;
      emptyDesc: string;
      colName: string;
      colMaxPoints: string;
      colOrigin: string;
      colStatus: string;
      colActions: string;
      origin: {
        division: string;
        union: string;
        local_field: string;
      };
      activate: string;
      deactivate: string;
      statusActive: string;
      statusInactive: string;
      edit: string;
      delete: string;
      readOnly: string;
    };
    divisionPage: {
      pageTitle: string;
      pageDescription: string;
    };
    localTab: {
      description: string;
    };
    unionTab: {
      description: string;
    };
  };
  member_of_month: {
    toasts: {
      evaluation_completed: string;
    };
    errors: {
      evaluation_failed: string;
      load_history_failed: string;
    };
    history: {
      title: string;
      description: string;
      tie: string;
      empty_title: string;
      empty_description: string;
      pagination_label: string;
      points: string;
    };
    page: {
      title: string;
      description: string;
      breadcrumbParent: string;
      breadcrumbParentHref: string;
      breadcrumbLabel: string;
      errorFallback: string;
      emptyNoTypesTitle: string;
      emptyNoTypesDescription: string;
    };
    supervision: {
      filterClubTypePlaceholder: string;
      filterClubTypeAll: string;
      filterLocalFieldPlaceholder: string;
      filterLocalFieldAll: string;
      filterYearPlaceholder: string;
      filterMonthPlaceholder: string;
      filterMonthAll: string;
      filterNotifiedPlaceholder: string;
      filterNotifiedAll: string;
      filterNotifiedTrue: string;
      filterNotifiedFalse: string;
      tableColMember: string;
      tableColSection: string;
      tableColClubType: string;
      tableColClub: string;
      tableColLocalField: string;
      tableColPeriod: string;
      tableColPoints: string;
      tableColNotified: string;
      tableColActions: string;
      badgeNotified: string;
      badgePending: string;
      emptyTitle: string;
      emptyHint: string;
      paginationTotal: string;
      paginationPage: string;
      paginationPrev: string;
      paginationNext: string;
      reevaluateButton: string;
    };
  };
  reports: {
    toasts: {
      manual_data_saved: string;
      report_generated: string;
      report_sent: string;
      data_updated: string;
    };
    errors: {
      save_manual_data: string;
      generate_report: string;
      send_report: string;
      load_reports: string;
      create_report: string;
      no_active_enrollment: string;
      no_role_access: string;
      unknown: string;
    };
    months: {
      "1": string;
      "2": string;
      "3": string;
      "4": string;
      "5": string;
      "6": string;
      "7": string;
      "8": string;
      "9": string;
      "10": string;
      "11": string;
      "12": string;
    };
    status: {
      draft: string;
      generated: string;
      submitted: string;
    };
    list: {
      filters: string;
      yearPlaceholder: string;
      allYears: string;
      statusPlaceholder: string;
      allStatuses: string;
      refresh: string;
      newReport: string;
      tableHeaderMonth: string;
      tableHeaderYear: string;
      tableHeaderStatus: string;
      tableHeaderGenerated: string;
      tableHeaderSubmitted: string;
      tableHeaderActions: string;
      emptyTitle: string;
      emptyDescription: string;
      actionView: string;
      actionEdit: string;
      actionGenerate: string;
      actionSend: string;
      actionPdf: string;
      ariaListLabel: string;
      ariaViewReport: string;
      ariaEditReport: string;
      toastCreated: string;
      toastGenerated: string;
      toastSent: string;
    };
    detail: {
      labelStatus: string;
      labelPeriod: string;
      labelGenerated: string;
      labelSubmitted: string;
      actionRegenerate: string;
      actionGenerate: string;
      actionSendToField: string;
      actionDownloadPdf: string;
      actionViewPdf: string;
      tabAutoData: string;
      tabManualData: string;
      tabSnapshot: string;
      noAutoData: string;
      autoDataDescription: string;
      autoDataLiveTitle: string;
      autoDataSnapshotTitle: string;
      fieldTotalMembers: string;
      fieldActiveMembers: string;
      fieldActivities: string;
      fieldHonorsEarned: string;
      fieldClassesCompleted: string;
      fieldAttendanceRate: string;
    };
    manualData: {
      sectionAdmin: string;
      sectionAdminDescription: string;
      fieldWeeklyMeetings: string;
      fieldLeadershipMeetings: string;
      fieldParentMeetings: string;
      fieldSpecialEvents: string;
      fieldAdminNotes: string;
      sectionMissionary: string;
      sectionMissionaryDescription: string;
      fieldBibleStudies: string;
      fieldSoulsWon: string;
      fieldCommunityEvents: string;
      fieldMissionaryTrips: string;
      fieldMissionaryNotes: string;
      sectionService: string;
      sectionServiceDescription: string;
      fieldServiceHours: string;
      fieldServiceProjects: string;
      fieldVolunteers: string;
      fieldServiceNotes: string;
      sectionGeneral: string;
      sectionGeneralDescription: string;
      fieldChallenges: string;
      fieldHighlights: string;
      fieldPrayerRequests: string;
      saveButton: string;
    };
    page: {
      title: string;
      description: string;
      empty_no_active_enrollment_title: string;
      empty_no_active_enrollment_description: string;
    };
    pageDetail: {
      description: string;
      back_link: string;
    };
    supervision: {
      page_title: string;
      page_description: string;
      breadcrumb_reports: string;
      breadcrumb_supervision: string;
      empty_no_catalogs_title: string;
      empty_no_catalogs_description: string;
      error_load_reports: string;
    };
    supervisionClient: {
      filterClubTypePlaceholder: string;
      filterClubTypeAll: string;
      filterLocalFieldPlaceholder: string;
      filterLocalFieldAll: string;
      filterYearPlaceholder: string;
      filterMonthPlaceholder: string;
      filterMonthAll: string;
      filterStatusPlaceholder: string;
      filterStatusAll: string;
      months: {
        "1": string;
        "2": string;
        "3": string;
        "4": string;
        "5": string;
        "6": string;
        "7": string;
        "8": string;
        "9": string;
        "10": string;
        "11": string;
        "12": string;
      };
      statusOptions: {
        draft: string;
        generated: string;
        submitted: string;
      };
      tableColClub: string;
      tableColType: string;
      tableColLocalField: string;
      tableColPeriod: string;
      tableColStatus: string;
      tableColGenerated: string;
      tableColSubmitted: string;
      tableColActions: string;
      memberCount: string;
      emptyTitle: string;
      emptyHint: string;
      paginationTotal: string;
      paginationPage: string;
      paginationPrev: string;
      paginationNext: string;
      actionView: string;
      actionPdf: string;
    };
  };
  requests: {
    errors: {
      unexpected: string;
      refresh: string;
    };
    status: {
      PENDING: string;
      APPROVED: string;
      REJECTED: string;
    };
    client: {
      count: string;
      refresh: string;
      tabs: {
        all: string;
        pending: string;
        approved: string;
        rejected: string;
      };
    };
    transfers: {
      table: {
        columns: {
          requester: string;
          from: string;
          to: string;
          reason: string;
          status: string;
          date: string;
          actions: string;
        };
        empty: {
          title: string;
          description: string;
        };
        actions: {
          approve: string;
          reject: string;
          approveAriaLabel: string;
          rejectAriaLabel: string;
        };
      };
      dialog: {
        approveTitle: string;
        rejectTitle: string;
        approveDescription: string;
        rejectDescription: string;
      };
    };
    assignments: {
      table: {
        columns: {
          targetUser: string;
          section: string;
          roleToAssign: string;
          requestedBy: string;
          status: string;
          date: string;
          actions: string;
        };
        empty: {
          title: string;
          description: string;
        };
        actions: {
          approve: string;
          reject: string;
          approveAriaLabel: string;
          rejectAriaLabel: string;
        };
      };
      dialog: {
        approveTitle: string;
        rejectTitle: string;
        approveDescription: string;
        rejectDescription: string;
      };
    };
    pageMembership: {
      title: string;
      description: string;
      errorLoad: string;
      emptyTitle: string;
      emptyDescription: string;
    };
    pageTransfers: {
      title: string;
      description: string;
      errorLoad: string;
      emptyTitle: string;
      emptyDescription: string;
    };
    pageAssignments: {
      title: string;
      description: string;
      errorLoad: string;
      emptyTitle: string;
      emptyDescription: string;
    };
    validation: {
      comment_required: string;
    };
  };
  insurance: {
    toasts: {
      updated: string;
      created: string;
      deactivated: string;
    };
    errors: {
      save_failed: string;
      deactivate_failed: string;
      failed_load_clubs: string;
    };
    table: {
      no_name: string;
      empty_title: string;
      empty_description: string;
      col_member: string;
      col_type: string;
      col_policy: string;
      col_provider: string;
      col_validity: string;
      col_coverage: string;
      col_status: string;
      status_no_insurance: string;
      status_expired: string;
      status_active: string;
      status_inactive: string;
      action_view_evidence: string;
      action_edit: string;
      action_register: string;
      action_deactivate: string;
      sr_edit: string;
      sr_deactivate: string;
    };
    view: {
      load_error: string;
      select_club_placeholder: string;
      select_section_placeholder: string;
      refresh_tooltip: string;
      prompt_select: string;
      loading: string;
      insured_count: string;
    };
    expiring: {
      filter_label: string;
      reset: string;
      no_results: string;
      results_count: string;
      kpi_total_title: string;
      kpi_critical_title: string;
      kpi_week_title: string;
      kpi_month_title: string;
      kpi_total_desc: string;
      kpi_critical_desc: string;
      kpi_week_desc: string;
      kpi_month_desc: string;
      empty_title: string;
      empty_description: string;
      col_member: string;
      col_club: string;
      col_type: string;
      col_policy: string;
      col_expiry: string;
      col_days: string;
      col_status: string;
      mobile_days_remaining: string;
      mobile_list_label: string;
      urgency_critical: string;
      urgency_warning: string;
      urgency_active: string;
      pagination_showing: string;
      pagination_prev: string;
      pagination_next: string;
      back_link: string;
    };
    alert: {
      title: string;
      subtitle: string;
      critical_note: string;
      view_all: string;
      expires_on: string;
    };
    page: {
      title: string;
      description: string;
      button_view_expiring: string;
      empty_no_clubs_title: string;
      empty_no_clubs_description: string;
    };
    pageExpiring: {
      title: string;
      description: string;
      window_label: string;
      error_load_failed: string;
    };
    validation: {
      start_date_required: string;
      end_date_required: string;
    };
    placeholders: {
      selectType: string;
      policyNumber: string;
      provider: string;
      amount: string;
    };
  };
  finances: {
    toasts: {
      categories_load_failed: string;
      transaction_updated: string;
      transaction_created: string;
      transaction_deleted: string;
    };
    validation: {
      section_required: string;
      year_invalid: string;
      year_range: string;
      month_invalid: string;
      month_range: string;
      amount_invalid: string;
      amount_positive: string;
      category_required: string;
      date_required: string;
    };
    errors: {
      delete_transaction_failed: string;
      update_transaction_failed: string;
      create_transaction_failed: string;
    };
    dashboard: {
      filtersLabel: string;
      allYears: string;
      allMonths: string;
      refreshButton: string;
      newTransactionButton: string;
      transactionsTitle: string;
      showing: string;
    };
    form: {
      titleNew: string;
      titleEdit: string;
      descriptionNew: string;
      descriptionEdit: string;
      categoryLabel: string;
      categoryPlaceholder: string;
      categoryLoading: string;
      dateLabel: string;
      amountLabel: string;
      yearLabel: string;
      yearPlaceholder: string;
      monthLabel: string;
      monthPlaceholder: string;
      sectionLabel: string;
      sectionPlaceholder: string;
      sectionEmpty: string;
      descriptionLabel: string;
      descriptionPlaceholder: string;
      cancelButton: string;
      saveButton: string;
      createButton: string;
    };
    table: {
      colDate: string;
      colDescription: string;
      colCategory: string;
      colPeriod: string;
      colType: string;
      colAmount: string;
      emptyTitle: string;
      emptyDescription: string;
      actionsLabel: string;
      actionEdit: string;
      actionDelete: string;
      typeIncome: string;
      typeExpense: string;
    };
    delete: {
      title: string;
      descriptionPre: string;
      cannotUndo: string;
      descriptionFallback: string;
      cancelButton: string;
      confirmButton: string;
    };
    summary: {
      totalIncome: string;
      totalExpense: string;
      balance: string;
      movementsCount: string;
      movementsCountPlural: string;
      inPeriod: string;
      positiveBalance: string;
      negativeBalance: string;
    };
    months: {
      january: string;
      february: string;
      march: string;
      april: string;
      may: string;
      june: string;
      july: string;
      august: string;
      september: string;
      october: string;
      november: string;
      december: string;
    };
    categoryType: {
      income: string;
      expense: string;
    };
    page: {
      title: string;
      description: string;
      empty_no_clubs_title: string;
      empty_no_clubs_description: string;
      error_unexpected: string;
    };
  };
  certifications: {
    toasts: {
      progress_load_failed: string;
      progress_update_failed: string;
    };
    list: {
      empty_title: string;
      empty_description: string;
      col_name: string;
      col_description: string;
      col_duration: string;
      col_modules: string;
      col_status: string;
      view_detail: string;
      status_active: string;
      status_inactive: string;
      duration_weeks: string;
    };
    tree: {
      no_modules: string;
      sections_count: string;
      modules_count: string;
      no_sections: string;
      required: string;
      expand_all: string;
      collapse_all: string;
    };
    pages: {
      list: {
        title: string;
        description: string;
        loadFailed: string;
        countSingular: string;
        countPlural: string;
      };
      detail: {
        description: string;
        back: string;
        infoCardTitle: string;
        labelId: string;
        labelDuration: string;
        labelModules: string;
        labelSections: string;
        durationWeeks: string;
        statusActive: string;
        statusInactive: string;
        tabModules: string;
        tabUsers: string;
        programCardTitle: string;
        enrolledCardTitle: string;
        enrollmentsEndpointMissing: string;
      };
    };
  };
  activities: {
    toasts: {
      updated: string;
      created: string;
      deleted: string;
    };
    errors: {
      save_failed: string;
      delete_failed: string;
    };
    view: {
      selectClubPlaceholder: string;
      allTypes: string;
      refresh: string;
      newActivity: string;
      loading: string;
      activitiesFoundOne: string;
      activitiesFoundOther: string;
      errors: {
        loadFailed: string;
      };
      types: {
        regular: string;
        especial: string;
        camporee: string;
      };
    };
    table: {
      emptyTitle: string;
      emptyDescription: string;
      colName: string;
      colType: string;
      colTime: string;
      colPlace: string;
      colMode: string;
      colStatus: string;
      editTitle: string;
      editLabel: string;
      deleteTitle: string;
      deleteLabel: string;
      viewDetail: string;
      statusActive: string;
      statusInactive: string;
      platformInPerson: string;
    };
    detailActions: {
      edit: string;
      delete: string;
      sectionFallback: string;
    };
    attendance: {
      emptyTitle: string;
      emptyDescription: string;
      colUser: string;
      colEmail: string;
      colRegistered: string;
    };
    page: {
      title: string;
      description: string;
      empty_no_clubs_title: string;
      empty_no_clubs_description: string;
      error_load_clubs: string;
    };
    pageDetail: {
      description: string;
      back_link: string;
      card_info_title: string;
      card_image_title: string;
      card_attendance_title: string;
      tab_attendance: string;
      badge_active: string;
      badge_inactive: string;
      badge_in_person: string;
      info_place: string;
      info_time: string;
      info_mode: string;
      info_meet_link: string;
      info_coordinates: string;
      error_attendance_load: string;
    };
    validation: {
      name_required: string;
      activity_type_required: string;
      club_type_required: string;
      club_section_required: string;
      activity_place_required: string;
      image_required: string;
    };
    placeholders: {
      name: string;
      description: string;
      selectType: string;
      selectClubType: string;
      selectSection: string;
      location: string;
      latitude: string;
      longitude: string;
      selectModality: string;
      meetUrl: string;
      externalUrl: string;
    };
  };
  year_end: {
    toasts: {
      year_closed: string;
    };
    errors: {
      preview_failed: string;
      close_year_failed: string;
    };
    page: {
      title: string;
      description: string;
      empty_no_years_title: string;
      empty_no_years_description: string;
      error_load_years: string;
    };
  };
  inventory: {
    toasts: {
      item_deleted: string;
      item_updated: string;
      item_created: string;
    };
    errors: {
      delete_failed: string;
      save_item_failed: string;
      load_history_failed: string;
      load_items_failed: string;
      failed_load_clubs: string;
    };
    table: {
      col_name: string;
      col_description: string;
      col_category: string;
      col_amount: string;
      col_status: string;
      empty_title: string;
      empty_description: string;
      category_fallback: string;
    };
    status: {
      active: string;
      inactive: string;
    };
    actions: {
      view_history: string;
      history_sr: string;
      edit_item: string;
      edit_sr: string;
      delete_item: string;
      delete_sr: string;
    };
    history: {
      dialog_title: string;
      loading: string;
      empty: string;
      action_create: string;
      action_update: string;
      action_delete: string;
      performed_by_system: string;
      field_name: string;
      field_description: string;
      field_amount: string;
      field_category: string;
      field_active: string;
    };
    view: {
      select_club_placeholder: string;
      all_categories: string;
      refresh_title: string;
      refresh_sr: string;
      new_item: string;
      loading: string;
      items_found_label: string;
    };
    page: {
      title: string;
      description: string;
      empty_no_clubs_title: string;
      empty_no_clubs_description: string;
    };
    validation: {
      name_min: string;
      name_max: string;
      description_max: string;
      category_required: string;
      amount_min: string;
    };
    placeholders: {
      name: string;
      description: string;
      selectCategory: string;
      quantity: string;
    };
  };
  units_admin: {
    validation: {
      member_required: string;
    };
    errors: {
      create_record_failed: string;
      add_member_failed: string;
      load_units_failed: string;
      remove_member_failed: string;
      update_value_failed: string;
      load_records_failed: string;
      deactivate_unit_failed: string;
    };
    toasts: {
      member_added: string;
      member_removed: string;
      weekly_record_created: string;
      unit_deactivated: string;
    };
    memberCombobox: {
      searchPlaceholder: string;
      loading: string;
      empty: string;
      clearSelection: string;
      loadError: string;
    };
    unitForm: {
      generalData: string;
      leaders: string;
      requiredHint: string;
      requiredHintSuffix: string;
      name: string;
      namePlaceholder: string;
      clubType: string;
      captain: string;
      captainPlaceholder: string;
      secretary: string;
      secretaryPlaceholder: string;
      advisor: string;
      advisorPlaceholder: string;
      substituteAdvisor: string;
      substituteAdvisorOptional: string;
      substituteAdvisorPlaceholder: string;
      submitCreate: string;
      submitEdit: string;
      submittingCreate: string;
      submittingEdit: string;
      clubTypeAdventurers: string;
      clubTypePathfinders: string;
      clubTypeMasterGuides: string;
    };
    placeholders: {
      selectMember: string;
    };
    a11y: {
      removeMember: string;
      editUnit: string;
      deleteUnit: string;
    };
  };
  system_config: {
    errors: {
      unexpected: string;
    };
    table: {
      col_key: string;
      col_value: string;
      col_description: string;
      col_type: string;
      col_actions: string;
      action_edit: string;
      action_edit_key: string;
      no_description: string;
      no_type: string;
      empty_title: string;
      empty_description: string;
    };
    client: {
      entry_count: string;
      btn_refresh: string;
      error_refresh: string;
    };
    validation: {
      config_value_required: string;
    };
  };
  shared: {
    errors: {
      unexpected: string;
      dashboardTitle: string;
      dashboardDescription: string;
      dashboardHeading: string;
      dashboardBody: string;
      dashboardRetry: string;
      dashboardGoHome: string;
      notFoundTitle: string;
      notFoundBody: string;
      notFoundGoHome: string;
    };
    pagination: {
      showing: string;
      perPage: string;
      pageOf: string;
      prevPage: string;
      nextPage: string;
    };
    sortable: {
      sortBy: string;
      sortedAscending: string;
      sortedDescending: string;
    };
    pageHeader: {
      breadcrumbNav: string;
    };
    errorBanner: {
      forbidden: string;
      missing: string;
      rateLimited: string;
      goToLogin: string;
    };
    appMetadata: {
      title: string;
      description: string;
    };
    uiPrimitives: {
      close: string;
      more: string;
      toggleSidebar: string;
    };
  };
  translations: {
    label_name: string;
    label_description: string;
    helper_optional: string;
  };
  memberRankingWeights: {
    formDialog: {
      clasePercent: string;
      investiduraPercent: string;
      campanaPercent: string;
      allTypes: string;
      anoEclesiastico: string;
      allYears: string;
    };
    table: {
      fallbackClubType: string;
      fallbackYear: string;
      defaultCardTitle: string;
      defaultBadge: string;
      editDefaultTitle: string;
      editButton: string;
      labelClase: string;
      labelInvestidura: string;
      labelCampana: string;
      overridesHeading: string;
      createOverride: string;
      emptyTitle: string;
      emptyDescription: string;
      colClubType: string;
      colAnoEclesiastico: string;
      colClase: string;
      colInvestidura: string;
      colCampana: string;
      colSuma: string;
      colAcciones: string;
      editOverrideTitle: string;
      deleteOverrideTitle: string;
      deleteButton: string;
    };
    pages: {
      list: {
        title: string;
        description: string;
        breadcrumbLabel: string;
        cannotShow: string;
      };
      new: {
        title: string;
        description: string;
        breadcrumbLabel: string;
        back: string;
      };
      edit: {
        titleDefault: string;
        titleOverride: string;
        description: string;
        breadcrumbDefault: string;
        breadcrumbOverride: string;
        back: string;
        cannotLoad: string;
      };
    };
    weightsPage: {
      deleteTitle: string;
      deleteDescription: string;
      deleteCancel: string;
      deleteConfirm: string;
      deleteConfirmLoading: string;
      deleteSuccess: string;
    };
    sumIndicator: {
      label: string;
      valid: string;
      invalid: string;
    };
  };
  rankingWeights: {
    clientPage: {
      defaultGlobalTitle: string;
      defaultGlobalDescription: string;
      defaultGlobalUpdated: string;
      defaultGlobalUpdateError: string;
      defaultGlobalNotFound: string;
      overridesTitle: string;
      overridesDescription: string;
      addOverride: string;
      newOverrideTitle: string;
      overridesEmpty: string;
      colClubType: string;
      colFolder: string;
      colFinance: string;
      colCamporee: string;
      colEvidence: string;
      colSuma: string;
      colAcciones: string;
      editButton: string;
      editOverrideTitle: string;
      overrideUpdated: string;
      overrideUpdateError: string;
      deleteButton: string;
      deleteOverrideTitle: string;
      deleteOverrideDescription: string;
      cancelButton: string;
      deletingLabel: string;
      overrideDeleted: string;
      overrideDeleteError: string;
    };
    form: {
      saving: string;
    };
    sum: {
      label: string;
    };
    override: {
      selectPlaceholder: string;
      noTypesAvailable: string;
      createLabel: string;
    };
    pages: {
      list: {
        title: string;
        description: string;
        loadFailed: string;
        emptyTitle: string;
        emptyDescription: string;
      };
    };
  };
  classes: {
    list: {
      empty_title: string;
      empty_description: string;
      col_order: string;
      col_name: string;
      col_club_type: string;
      col_modules: string;
      col_status: string;
      view_detail: string;
    };
    tree: {
      no_modules: string;
      sections_count: string;
      modules_count: string;
      no_sections: string;
      expand_all: string;
      collapse_all: string;
      section_fallback: string;
      module_fallback: string;
      status_inactive: string;
    };
    status: {
      active: string;
      inactive: string;
    };
    pages: {
      list: {
        title: string;
        description: string;
        loadFailed: string;
        countSingular: string;
        countPlural: string;
      };
      detail: {
        description: string;
        back: string;
        infoCardTitle: string;
        labelId: string;
        labelClubType: string;
        labelOrder: string;
        labelStatus: string;
        labelMaxPoints: string;
        labelMinPoints: string;
        statOrder: string;
        statModules: string;
        statSections: string;
        statPoints: string;
        tabStructure: string;
        structureCardTitle: string;
        modulesEndpointMissing: string;
      };
    };
  };
  membership: {
    pending: {
      description: string;
      no_active_sections_title: string;
      no_active_sections_description: string;
      section_label: string;
      section_placeholder: string;
      section_fallback: string;
      load_error: string;
    };
    table: {
      count_one: string;
      count_other: string;
      refresh: string;
      refresh_error: string;
      col_member: string;
      col_role: string;
      col_requested: string;
      col_expires: string;
      col_actions: string;
      empty_title: string;
      empty_description: string;
      aria_approve: string;
      aria_reject: string;
      tooltip_approve: string;
      tooltip_reject: string;
    };
    dialogs: {
      reject: {
        title: string;
        description: string;
        reason_label: string;
        reason_placeholder: string;
        cancel: string;
        confirm: string;
        confirming: string;
      };
    };
    client: {
      section_label: string;
      section_placeholder: string;
      load_error_permission: string;
      load_error_generic: string;
    };
    toasts: {
      approved: string;
      rejected: string;
    };
    errors: {
      approve: string;
      reject: string;
    };
  };
  sla: {
    client: {
      title: string;
      description: string;
      updated: string;
      cached: string;
    };
    stats: {
      total_pending: string;
      total_pending_subtitle: string;
      overdue: string;
      overdue_subtitle: string;
      overdue_badge_ok: string;
      overdue_badge_attention: string;
      avg_approval: string;
      avg_approval_subtitle: string;
      avg_approval_days: string;
      avg_approval_no_data: string;
      approval_rate: string;
      approval_rate_subtitle: string;
      approval_rate_badge: string;
    };
    pipeline: {
      title: string;
      description: string;
      description_distribution: string;
      empty: string;
      tooltip_enrollments: string;
    };
    throughput: {
      title: string;
      description: string;
      empty: string;
      legend_approved: string;
      legend_rejected: string;
    };
    validation: {
      title: string;
      description_pending: string;
      description_empty: string;
      class_sections_label: string;
      class_sections_subtitle: string;
      honors_label: string;
      honors_subtitle: string;
    };
    camporee: {
      title: string;
      description_pending: string;
      description_empty: string;
      clubs_label: string;
      clubs_subtitle: string;
      members_label: string;
      members_subtitle: string;
      payments_label: string;
      payments_subtitle: string;
    };
    actions: {
      refresh: string;
      refreshing: string;
    };
    page: {
      title: string;
      description: string;
    };
    errors: {
      load_failed: string;
    };
  };
  enrollments: {
    table: {
      col_member: string;
      col_class: string;
      col_status: string;
      col_enrollment_date: string;
      col_submitted_at: string;
      col_actions: string;
      empty: string;
      status: {
        IN_PROGRESS: string;
        SUBMITTED_FOR_VALIDATION: string;
        APPROVED: string;
        REJECTED: string;
        INVESTIDO: string;
      };
    };
    actions: {
      approve: string;
      reject: string;
      view_user: string;
      reject_dialog_title: string;
      reject_dialog_description: string;
      reject_dialog_cancel: string;
      reject_dialog_confirm: string;
    };
    toasts: {
      approved: string;
      rejected: string;
    };
    errors: {
      generic: string;
    };
    page: {
      title: string;
      description: string;
      searchPlaceholder: string;
      errorEmptyTitle: string;
      emptyTitle: string;
      emptyDescription: string;
      countSingular: string;
      countPlural: string;
    };
  };
  rankings: {
    breakdown: {
      compositeScore: string;
      weightsApplied: string;
      weightsSource: string;
      weightsSourceDefault: string;
      weightsSourceOverride: string;
      componentFolder: string;
      componentFinance: string;
      componentCamporee: string;
      componentEvidence: string;
      pointsOf: string;
      sectionsEvaluated: string;
      monthsClosedOnTime: string;
      deadlineDay: string;
      missedMonths: string;
      camporeeEventsOf: string;
      evidenceValidatedRejected: string;
      evidencePendingExcluded: string;
    };
    pageMember: {
      title: string;
      description: string;
      emptyNoYearTitle: string;
      emptyNoYearDescription: string;
      emptyTitle: string;
      emptyDescription: string;
    };
    pageMemberBreakdown: {
      back: string;
      breadcrumbParent: string;
      position: string;
      compositeScore: string;
      category: string;
      weightsTitle: string;
      weightsSource: string;
      weightsFormula: string;
      lastCalculated: string;
      lastCalculatedNone: string;
      titleClass: string;
      titleInvestiture: string;
      titleCamporee: string;
      sectionsCompleted: string;
      folder: string;
      status: string;
      participation: string;
      availableCamporees: string;
      yes: string;
      no: string;
      statusNoRecord: string;
      statusInvestido: string;
      statusCompleted: string;
      statusInProgress: string;
      statusPending: string;
      statusNotStarted: string;
      titleDetail: string;
      descriptionDetail: string;
    };
    pageSection: {
      title: string;
      description: string;
      emptyNoYearTitle: string;
      emptyNoYearDescription: string;
      emptyTitle: string;
      emptyDescription: string;
    };
    pageSectionMembers: {
      title: string;
      description: string;
      memberSingular: string;
      memberPlural: string;
      back: string;
      breadcrumbParent: string;
      breadcrumbCurrent: string;
    };
    filters: {
      labelYear: string;
      labelClub: string;
      labelSection: string;
      placeholderYear: string;
      placeholderClub: string;
      placeholderSection: string;
      apply: string;
      clear: string;
    };
    table: {
      colRank: string;
      colMember: string;
      colSection: string;
      colComposite: string;
      colClass: string;
      colInvestiture: string;
      colCamporee: string;
      colCategory: string;
      colAction: string;
      emptyTitle: string;
      emptyDescription: string;
      countSingular: string;
      countPlural: string;
      investedLabel: string;
      inProgressLabel: string;
      viewDetail: string;
    };
    breakdownCard: {
      weightLabel: string;
      scoreLabel: string;
    };
    sectionFilters: {
      labelYear: string;
      labelClub: string;
      placeholderYear: string;
      placeholderClub: string;
      apply: string;
      clear: string;
    };
    sectionTable: {
      colRank: string;
      colSection: string;
      colComposite: string;
      colActiveMembers: string;
      colCategory: string;
      colCalculated: string;
      colAction: string;
      emptyTitle: string;
      emptyDescription: string;
      countSingular: string;
      countPlural: string;
      viewMembers: string;
    };
    sectionMembersTable: {
      colRank: string;
      colMember: string;
      colComposite: string;
      colClass: string;
      colInvestiture: string;
      colCamporee: string;
      colCategory: string;
      colAction: string;
      emptyTitle: string;
      emptyDescription: string;
      investedLabel: string;
      inProgressLabel: string;
      viewDetail: string;
    };
  };
  system_jobs: {
    page: {
      title: string;
      description: string;
      cronSection: {
        heading: string;
        description: string;
        viewHistory: string;
      };
      errors: {
        bullmqLoad: string;
        cronLoad: string;
      };
    };
    pageHistory: {
      title: string;
      description: string;
      back: string;
      errorLoad: string;
    };
    cronRuns: {
      cardTitle: string;
      colJob: string;
      colLastRun: string;
      colStatus: string;
      colDuration: string;
      colItems: string;
      colLastSuccess: string;
      colLastFailure: string;
      colFailureRate: string;
      colRuns7d: string;
      noRuns: string;
      statusCompleted: string;
      statusFailed: string;
      statusRunning: string;
      statusSkipped: string;
      jobMonthlyReports: string;
      jobRankingsRecalculate: string;
      jobDataExportCleanup: string;
      jobMemberOfMonth: string;
      jobFinancePeriod: string;
      jobActivitiesReminder: string;
      jobMembershipExpiry: string;
      jobCleanupExpired: string;
      jobFcmCleanup: string;
    };
    overview: {
      queuesTitle: string;
      queuesCountSingular: string;
      queuesCountPlural: string;
      refreshButton: string;
      refreshLoading: string;
      noQueues: string;
      activeLabel: string;
      statWaiting: string;
      statActive: string;
      statCompleted: string;
      statFailed: string;
      statDelayed: string;
      statPaused: string;
      failedJobsTitle: string;
      failedJobsEmpty: string;
      colQueue: string;
      colJob: string;
      colReason: string;
      colAttempts: string;
      colDate: string;
      colAction: string;
      retryButton: string;
      retryLoading: string;
      retryDialogTitle: string;
      retryDialogDescription: string;
      retryDialogCancel: string;
      retryDialogConfirm: string;
      retrySuccess: string;
      retrySuccessDescription: string;
      retryErrorTitle: string;
      retryErrorFallback: string;
      queueNotifications: string;
      queueNotificationsDesc: string;
      queueEmail: string;
      queueEmailDesc: string;
      queueAchievements: string;
      queueAchievementsDesc: string;
      queueBackgroundJobs: string;
      queueBackgroundJobsDesc: string;
    };
    history: {
      filterLabelJob: string;
      filterLabelStatus: string;
      filterLabelSince: string;
      filterLabelUntil: string;
      filterAllJobs: string;
      filterAllStatuses: string;
      statusCompleted: string;
      statusFailed: string;
      statusSkipped: string;
      statusRunning: string;
      recordCount: string;
      noResults: string;
      colJob: string;
      colStart: string;
      colStatus: string;
      colDuration: string;
      colItems: string;
      colError: string;
      colDetails: string;
      viewButton: string;
      pagination: string;
      paginationPrev: string;
      paginationNext: string;
      detailTitle: string;
      detailLabelJob: string;
      detailLabelStatus: string;
      detailLabelStart: string;
      detailLabelEnd: string;
      detailLabelDuration: string;
      detailLabelItems: string;
      detailLabelError: string;
      detailLabelMetadata: string;
      jobMonthlyReports: string;
      jobRankingsRecalculate: string;
      jobDataExportCleanup: string;
      jobMemberOfMonth: string;
      jobFinancePeriod: string;
      jobActivitiesReminder: string;
      jobMembershipExpiry: string;
      jobCleanupExpired: string;
      jobFcmCleanup: string;
    };
  };
  settings: {
    pages: {
      root: {
        title: string;
        description: string;
        loadFailed: string;
        emptyTitle: string;
        emptyDescription: string;
      };
      scoringCategories: {
        title: string;
        description: string;
        metadataTitle: string;
      };
    };
  };
}
