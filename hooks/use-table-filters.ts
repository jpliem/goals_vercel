import { useMemo, useState } from "react";

export function useTableFilters<T>(data: T[] | undefined | null) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>(["all"]);
  const [requestTypeFilter, setRequestTypeFilter] = useState("all");
  const [picFilter, setPicFilter] = useState<string[]>(["all"]);
  const [techLeadFilter, setTechLeadFilter] = useState<string[]>(["all"]);
  const [requestorFilter, setRequestorFilter] = useState<string[]>(["all"]);
  const [executorFilter, setExecutorFilter] = useState<string[]>(["all"]);
  const [applicationFilter, setApplicationFilter] = useState<string[]>(["all"]);
  const [hideClosed, setHideClosed] = useState(true); // Default to hiding closed requests

  const filteredData = useMemo(() => {
    // Ensure data is always an array
    const safeData = Array.isArray(data) ? data : [];
    
    return safeData.filter((item: any) => {
      const searchMatch = Object.values(item).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
      const statusMatch = statusFilter.includes("all") || statusFilter.includes(item.status);
      const requestTypeMatch = requestTypeFilter === "all" || (() => {
        const requestType = item.request_type;
        if (requestType === "new_application") return requestTypeFilter === "new";
        if (requestType === "enhancement") return requestTypeFilter === "enhancement";
        if (requestType === "hardware") return requestTypeFilter === "hardware";
        return requestTypeFilter === "all";
      })();
      
      // Hide closed/completed requests filter
      const closedMatch = !hideClosed || (item.status !== "Closed" && item.status !== "Rejected");
      
      // PIC filtering (current person in charge based on status)
      const picMatch = picFilter.includes("all") || (() => {
        let currentPIC = "";
        switch (item.status) {
          case "Initial Analysis":
          case "Code Review":
            currentPIC = item.tech_lead?.id || "";
            break;
          case "In Progress":
          case "Rework":
          case "Pending Deployment":
            // For multi-executor scenarios, check if user is any of the executors
            if (item.executors && item.executors.length > 0) {
              const isMultiExecutor = item.executors.some((executor: any) => picFilter.includes(executor.user_id));
              if (isMultiExecutor) return true;
            }
            // Fallback to legacy single executor
            currentPIC = item.executor?.id || "";
            break;
          case "Pending UAT":
            currentPIC = item.requestor?.id || "";
            break;
          case "New":
          case "Pending Assignment":
            currentPIC = "admin";
            break;
          default:
            currentPIC = "";
        }
        return picFilter.includes(currentPIC);
      })();
      
      // Tech Lead filtering
      const techLeadMatch = techLeadFilter.includes("all") || techLeadFilter.includes(item.tech_lead?.id);
      
      // Requestor filtering
      const requestorMatch = requestorFilter.includes("all") || requestorFilter.includes(item.requestor?.id);

      // Executor filtering
      const executorMatch = executorFilter.includes("all") || (() => {
        if (executorFilter.includes("unassigned")) {
          // Check if no executor is assigned (both legacy and multi-executor)
          const isUnassigned = !item.executor_id && (!item.executors || item.executors.length === 0);
          if (isUnassigned) return true;
        }
        
        // Check multi-executor assignments first
        if (item.executors && item.executors.length > 0) {
          return item.executors.some((executor: any) => executorFilter.includes(executor.user_id));
        }
        
        // Fallback to legacy single executor
        return executorFilter.includes(item.executor?.id);
      })();

      // Application filtering (multi-select)
      const applicationMatch = applicationFilter.includes("all") || (() => {
        if (!item.application?.id) return false;
        return applicationFilter.includes(item.application.id);
      })();

      return searchMatch && statusMatch && requestTypeMatch && closedMatch && picMatch && techLeadMatch && requestorMatch && executorMatch && applicationMatch;
    });
  }, [data, searchTerm, statusFilter, requestTypeFilter, hideClosed, picFilter, techLeadFilter, requestorFilter, executorFilter, applicationFilter]);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    requestTypeFilter,
    setRequestTypeFilter,
    picFilter,
    setPicFilter,
    techLeadFilter,
    setTechLeadFilter,
    requestorFilter,
    setRequestorFilter,
    executorFilter,
    setExecutorFilter,
    applicationFilter,
    setApplicationFilter,
    hideClosed,
    setHideClosed,
    filteredData,
  };
}
