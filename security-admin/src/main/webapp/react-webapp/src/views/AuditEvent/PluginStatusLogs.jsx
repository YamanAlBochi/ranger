/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import { Row, Col } from "react-bootstrap";
import XATableLayout from "Components/XATableLayout";
import { AuditFilterEntries } from "Components/CommonComponents";
import moment from "moment-timezone";
import {
  setTimeStamp,
  fetchSearchFilterParams,
  parseSearchFilter,
  serverError,
  isKeyAdmin,
  isKMSAuditor
} from "Utils/XAUtils";
import {
  CustomPopover,
  CustomTooltip,
  Loader
} from "../../components/CommonComponents";
import StructuredFilter from "../../components/structured-filter/react-typeahead/tokenizer";
import { fetchApi } from "Utils/fetchAPI";
import {
  isUndefined,
  map,
  sortBy,
  toUpper,
  filter,
  isNull,
  isEmpty
} from "lodash";
import { getServiceDef } from "../../utils/appState";
import { pluginStatusColumnInfo } from "../../utils/XAMessages";
import { pluginStatusColumnInfoMsg } from "../../utils/XAEnums";

function Plugin_Status() {
  const context = useOutletContext();
  const services = context.services;
  const servicesAvailable = context.servicesAvailable;
  const [pluginStatusListingData, setPluginStatusLogs] = useState([]);
  const [loader, setLoader] = useState(true);
  const [entries, setEntries] = useState([]);
  const [updateTable, setUpdateTable] = useState(moment.now());
  const fetchIdRef = useRef(0);
  const [contentLoader, setContentLoader] = useState(true);
  const [searchFilterParams, setSearchFilterParams] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [defaultSearchFilterParams, setDefaultSearchFilterParams] = useState(
    []
  );
  const [resetPage, setResetpage] = useState({ page: null });
  const isKMSRole = isKeyAdmin() || isKMSAuditor();
  const { allServiceDefs } = getServiceDef();

  useEffect(() => {
    if (servicesAvailable !== null) {
      let { searchFilterParam, defaultSearchFilterParam, searchParam } =
        fetchSearchFilterParams(
          "pluginStatus",
          searchParams,
          searchFilterOptions
        );

      // Updating the states for search params, search filter, default search filter and localStorage
      setSearchParams(searchParam, { replace: true });
      if (
        JSON.stringify(searchFilterParams) !== JSON.stringify(searchFilterParam)
      ) {
        setSearchFilterParams(searchFilterParam);
      }
      setDefaultSearchFilterParams(defaultSearchFilterParam);
      localStorage.setItem("pluginStatus", JSON.stringify(searchParam));
      setContentLoader(false);
    }
  }, [searchParams, servicesAvailable]);

  const fetchPluginStatusInfo = useCallback(
    async ({ pageSize, pageIndex, gotoPage }) => {
      setLoader(true);
      if (servicesAvailable !== null) {
        let logsResp = [];
        let logs = [];
        const fetchId = ++fetchIdRef.current;
        let params = { ...searchFilterParams };
        if (fetchId === fetchIdRef.current) {
          params["startIndex"] = pageIndex * pageSize;
          try {
            logsResp = await fetchApi({
              url: "plugins/plugins/info",
              params: params
            });
            logs = logsResp.data.pluginInfoList;
          } catch (error) {
            serverError(error);
            console.error(
              `Error occurred while fetching Plugin Status logs! ${error}`
            );
          }
          setPluginStatusLogs(logs);
          setEntries(logsResp.data);
          setResetpage({ page: gotoPage });
          setLoader(false);
        }
      }
    },
    [updateTable, searchFilterParams, servicesAvailable]
  );

  const isDateDifferenceMoreThanHr = (date1, date2) => {
    let diff = (date1 - date2) / 36e5;
    return diff < 0 ? true : false;
  };

  const getLastUpdateTime = (lastUpdateTime) => {
    if (isUndefined(lastUpdateTime) || isNull(lastUpdateTime)) {
      return <center>--</center>;
    }
    return setTimeStamp(lastUpdateTime);
  };

  const getDownloadTime = (downloadTime, lastUpdateTime, columnsName) => {
    if (isUndefined(downloadTime) || isNull(downloadTime)) {
      return <center>--</center>;
    }

    if (!isUndefined(lastUpdateTime)) {
      let downloadDate = new Date(parseInt(downloadTime));
      let lastUpdateDate = new Date(parseInt(lastUpdateTime));
      if (isDateDifferenceMoreThanHr(downloadDate, lastUpdateDate)) {
        if (
          moment(downloadDate).diff(moment(lastUpdateDate), "minutes") >= -2
        ) {
          return (
            <span className="text-warning">
              <CustomTooltip
                placement="bottom"
                content={
                  pluginStatusColumnInfoMsg[columnsName].downloadTimeDelayMsg
                }
                icon="fa-fw fa fa-exclamation-circle active-policy-alert"
              />
              {setTimeStamp(downloadTime)}
            </span>
          );
        } else {
          return (
            <span className="text-error">
              <CustomTooltip
                placement="bottom"
                content={
                  pluginStatusColumnInfoMsg[columnsName].downloadTimeDelayMsg
                }
                icon="fa-fw fa fa-exclamation-circle active-policy-alert"
              />
              {setTimeStamp(downloadTime)}{" "}
            </span>
          );
        }
      }
    }
    return setTimeStamp(downloadTime);
  };

  const getActivationTime = (activeTime, lastUdpateTime, columnsName) => {
    if (isUndefined(activeTime) || isNull(activeTime) || activeTime == 0) {
      return <center>--</center>;
    }
    if (!isUndefined(lastUdpateTime)) {
      let activeDate = new Date(parseInt(activeTime));
      let lastUpdateDate = new Date(parseInt(lastUdpateTime));
      if (isDateDifferenceMoreThanHr(activeDate, lastUpdateDate)) {
        if (moment(activeDate).diff(moment(lastUpdateDate), "minutes") >= -2) {
          return (
            <span className="text-warning">
              <CustomTooltip
                placement="bottom"
                content={
                  pluginStatusColumnInfoMsg[columnsName].activationTimeDelayMsg
                }
                icon="fa-fw fa fa-exclamation-circle active-policy-alert"
              />
              {setTimeStamp(activeTime)}
            </span>
          );
        } else {
          return (
            <span className="text-error">
              <CustomTooltip
                placement="bottom"
                content={
                  pluginStatusColumnInfoMsg[columnsName].activationTimeDelayMsg
                }
                icon="fa-fw fa fa-exclamation-circle active-policy-alert"
              />
              {setTimeStamp(activeTime)}
            </span>
          );
        }
      }
    }
    return setTimeStamp(activeTime);
  };

  const refreshTable = () => {
    setPluginStatusLogs([]);
    setLoader(true);
    setUpdateTable(moment.now());
  };

  const infoIcon = (columnsName) => {
    return (
      <>
        <b>{columnsName} ( Time )</b>

        <CustomPopover
          icon="fa-fw fa fa-info-circle info-icon"
          title={pluginStatusColumnInfoMsg[columnsName].title}
          content={pluginStatusColumnInfo(columnsName)}
          placement="left"
          trigger={["hover", "focus"]}
        />
      </>
    );
  };

  const columns = React.useMemo(
    () => [
      {
        Header: "Service Name",
        accessor: "serviceDisplayName",
        sortMethod: (a, b) => {
          if (a.length === b.length) {
            return a > b ? 1 : -1;
          }
          return a.length > b.length ? 1 : -1;
        }
      },
      {
        Header: "Service Type",
        accessor: "serviceType",
        Cell: (rawValue) => {
          return (
            <div className="text-truncate">
              <span title={rawValue.value}>{rawValue.value}</span>
            </div>
          );
        }
      },
      {
        Header: "Application",
        accessor: "appType"
      },
      {
        Header: "Host Name",
        accessor: "hostName",
        Cell: (rawValue) => {
          return (
            <div className="text-truncate">
              <span title={rawValue.value}>{rawValue.value}</span>
            </div>
          );
        }
      },
      {
        Header: "Plugin IP",
        accessor: "ipAddress"
      },
      {
        Header: "Cluster Name",
        accessor: "clusterName",
        Cell: ({ row: { original } }) => {
          let clusterName = original?.info?.clusterName;
          return !isEmpty(clusterName) ? clusterName : <center>--</center>;
        }
      },
      {
        Header: infoIcon("Policy"),
        id: "Policy (Time)",
        columns: [
          {
            Header: "Last Update",
            accessor: "lastPolicyUpdateTime",
            Cell: ({ row: { original } }) => {
              return getLastUpdateTime(original.info.lastPolicyUpdateTime);
            },
            minWidth: 190
          },
          {
            Header: "Download",
            accessor: "policyDownloadTime",
            Cell: ({ row: { original } }) => {
              return getDownloadTime(
                original.info.policyDownloadTime,
                original.info.lastPolicyUpdateTime,
                "Policy"
              );
            },
            minWidth: 190
          },
          {
            Header: "Active",
            accessor: "policyActivationTime",
            Cell: ({ row: { original } }) => {
              return getActivationTime(
                original.info.policyActivationTime,
                original.info.lastPolicyUpdateTime,
                "Policy"
              );
            },
            minWidth: 190
          }
        ]
      },
      {
        Header: infoIcon("Tag"),
        id: "Tag (Time)",
        columns: [
          {
            Header: "Last Update",
            accessor: "lastTagUpdateTime",
            Cell: ({ row: { original } }) => {
              return getLastUpdateTime(original.info.lastTagUpdateTime);
            },
            minWidth: 190
          },
          {
            Header: "Download",
            accessor: "tagDownloadTime",

            Cell: ({ row: { original } }) => {
              return getDownloadTime(
                original.info.tagDownloadTime,
                original.info.lastTagUpdateTime,
                "Tag"
              );
            },
            minWidth: 190
          },
          {
            Header: "Active",
            accessor: "tagActivationTime",

            Cell: ({ row: { original } }) => {
              return getActivationTime(
                original.info.tagActivationTime,
                original.info.lastTagUpdateTime,
                "Tag"
              );
            },
            minWidth: 190
          }
        ]
      },
      {
        Header: infoIcon("GDS"),
        id: "GDS (Time)",
        columns: [
          {
            Header: "Last Update",
            accessor: "lastGdsUpdateTime",
            Cell: ({ row: { original } }) => {
              return getLastUpdateTime(original.info.lastGdsUpdateTime);
            },
            minWidth: 190
          },
          {
            Header: "Download",
            accessor: "gdsDownloadTime",
            Cell: ({ row: { original } }) => {
              return getDownloadTime(
                original.info.gdsDownloadTime,
                original.info.lastGdsUpdateTime,
                "GDS"
              );
            },
            minWidth: 190
          },
          {
            Header: "Active",
            accessor: "gdsActivationTime",
            Cell: ({ row: { original } }) => {
              return getActivationTime(
                original.info.gdsActivationTime,
                original.info.lastGdsUpdateTime,
                "GDS"
              );
            },
            minWidth: 190
          }
        ]
      },
      {
        Header: infoIcon("Role"),
        id: "Role (Time)",
        columns: [
          {
            Header: "Last Update",
            accessor: "lastRoleUpdateTime",
            Cell: ({ row: { original } }) => {
              return getLastUpdateTime(original.info.lastRoleUpdateTime);
            },
            minWidth: 190
          },
          {
            Header: "Download",
            accessor: "roleDownloadTime",
            Cell: ({ row: { original } }) => {
              return getDownloadTime(
                original.info.roleDownloadTime,
                original.info.lastRoleUpdateTime,
                "Role"
              );
            },
            minWidth: 190
          },
          {
            Header: "Active",
            accessor: "roleActivationTime",
            Cell: ({ row: { original } }) => {
              return getActivationTime(
                original.info.roleActivationTime,
                original.info.lastRoleUpdateTime,
                "Role"
              );
            },
            minWidth: 190
          }
        ]
      }
    ],
    []
  );

  const updateSearchFilter = (filter) => {
    let { searchFilterParam, searchParam } = parseSearchFilter(
      filter,
      searchFilterOptions
    );

    setSearchFilterParams(searchFilterParam);
    setSearchParams(searchParam, { replace: true });
    localStorage.setItem("pluginStatus", JSON.stringify(searchParam));

    if (typeof resetPage?.page === "function") {
      resetPage.page(0);
    }
  };

  const getServiceDefType = () => {
    let serviceDefType = [];

    serviceDefType = map(allServiceDefs, function (serviceDef) {
      return {
        label: toUpper(serviceDef.displayName),
        value: serviceDef.name
      };
    });

    return serviceDefType;
  };

  const getServices = () => {
    let servicesName = [];
    servicesName = filter(services, function (service) {
      return !isKMSRole
        ? service.type !== "tag" && service.type !== "kms"
        : service.type !== "tag";
    });

    return sortBy(servicesName, "name")?.map((service) => ({
      label: service.displayName,
      value: service.name
    }));
  };

  const searchFilterOptions = [
    {
      category: "pluginAppType",
      label: "Application",
      urlLabel: "applicationType",
      type: "text"
    },
    {
      category: "clusterName",
      label: "Cluster Name",
      urlLabel: "clusterName",
      type: "text"
    },
    {
      category: "pluginHostName",
      label: "Host Name",
      urlLabel: "hostName",
      type: "text"
    },
    {
      category: "pluginIpAddress",
      label: "Plugin IP",
      urlLabel: "agentIp",
      type: "text"
    },
    {
      category: "serviceName",
      label: "Service Name",
      urlLabel: "serviceName",
      type: "textoptions",
      options: getServices
    },
    {
      category: "serviceType",
      label: "Service Type",
      urlLabel: "serviceType",
      type: "textoptions",
      options: getServiceDefType
    }
  ];

  return contentLoader ? (
    <Loader />
  ) : (
    <div className="wrap">
      <React.Fragment>
        <Row className="mb-2">
          <Col sm={12}>
            <div className="searchbox-border">
              <StructuredFilter
                key="plugin-status-log-search-filter"
                placeholder="Search for your plugin status..."
                options={sortBy(searchFilterOptions, ["label"])}
                onChange={updateSearchFilter}
                defaultSelected={defaultSearchFilterParams}
              />
            </div>
          </Col>
        </Row>
        <Row>
          <Col sm={11}>
            <AuditFilterEntries entries={entries} refreshTable={refreshTable} />
          </Col>
        </Row>
        <XATableLayout
          data={pluginStatusListingData}
          columns={columns}
          loading={loader}
          totalCount={entries && entries.totalCount}
          fetchData={fetchPluginStatusInfo}
          columnSort={true}
          clientSideSorting={true}
          showPagination={false}
          columnHide={{ tableName: "pluginStatus", isVisible: true }}
        />
      </React.Fragment>
    </div>
  );
}

export default Plugin_Status;
