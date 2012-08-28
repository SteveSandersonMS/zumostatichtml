(function(global, undefined) {
    this.MobileServiceClient = function(applicationUrl, applicationKey) {
        var self = this;
        this.applicationUrl = applicationUrl;
        this.applicationKey = applicationKey;
        this.proxy = "http://warm-retreat-1322.herokuapp.com/";
        
        this.auth = new authWrapper(function(token) {
            return self._loginUsingLiveSdkToken(token);
        });
    };

    this.MobileServiceClient.prototype.issueRequest = function(httpMethod, url, payload, queryString) {
        var allHeaders = {
            "X-Zumo-Application": this.applicationKey
        };

        if (this.currentCredentials) {
            allHeaders["X-Zumo-Auth"] = this.currentCredentials.authenticationToken;
        }

        var proxyUrl = this.proxy + "?" + $.param({
                method: httpMethod,
                url: this.applicationUrl + url + (queryString ? "?" + queryString : ""),
                headers: JSON.stringify(allHeaders),
                payload: payload ? JSON.stringify(payload) : undefined
            });

        return $.Deferred(function(deferred) {
            $.ajax({ url: proxyUrl + "&jsonp=?", dataType: "jsonp" }).done(function(result) {
                if (result.statusCode >= 400) {
                    deferred.rejectWith(null, [{ status: result.statusCode }, "Error", result.data.error]);
                } else {           
                    deferred.resolveWith(null, [result.data, "OK", { status: result.statusCode }]);
                }
            });
        }).promise();
    };

    this.MobileServiceClient.prototype.issueTableRequest = function(httpMethod, table, id, payload, queryString) {
        var url = "tables/" + table + (id ? "/" + id : "");
        return this.issueRequest(httpMethod, url, payload, queryString);
    };

    this.MobileServiceClient.prototype.getTable = function(tableName) {
        return new tableRef(tableName, this);
    };

    this.MobileServiceClient.prototype._loginUsingLiveSdkToken = function(authenticationToken) {
        var self = this;
        return this.issueRequest("post", "login?mode=authenticationToken", { authenticationToken: authenticationToken }).done(function(result) {
            self.currentCredentials = result;
        });
    };

    // tableRef ---------------------------------------------

    function tableRef(tableName, client) {
        this.tableName = tableName;
        this.client = client;
    }

    tableRef.prototype.read = function(query) {
        var queryString = undefined;
        if (query) {
            // Really basic query support - only handles "A eq B and C eq D" etc.
            var filterString = "";
            for (var key in query) {
                if (query.hasOwnProperty(key)) {
                    if (filterString) {
                        filterString += " and ";
                    }
                    filterString += key + " eq " + query[key];
                }
            }

            queryString = $.param({ "$filter": filterString });
        }

        return this.client.issueTableRequest("get", this.tableName, undefined, undefined, queryString);
    };

    tableRef.prototype.insert = function(item) {
        return this.client.issueTableRequest("post", this.tableName, undefined, item);
    };

    tableRef.prototype.update = function(item) {
        return this.client.issueTableRequest("patch", this.tableName, item.id, item);
    };                

    tableRef.prototype.del = function(id) {
        return this.client.issueTableRequest("delete", this.tableName, id);
    };

    tableRef.prototype.save = function(item) {
        if (item.id) {
            return this.update(item);
        } else {
            return this.insert(item);
        }
    };

    // auth ---------------------------------------------

    function authWrapper(gotAuthTokenCallback) {
        this.gotAuthTokenCallback = gotAuthTokenCallback;
    }

    authWrapper.prototype.init = function(options) {
        var self = this;

        if (!global.WL) {
            throw new Error("Windows Live APIs not found. Add a script reference to //js.live.net/v5.0/wl.js");
        }
        if (!options.clientId) {
            throw new Error("Specify a clientId value. For example, myClient.auth.init({ clientId: 'your value' });");
        }

        WL.Event.subscribe("auth.login", function() {
            var session = WL.getSession();
            if (session) {
                self.gotAuthTokenCallback(session.authentication_token).done(function(result) {
                    if (options.onLogin) {
                        options.onLogin();
                    }
                });
            }
        });

        WL.Event.subscribe("auth.logout", function() {
            if (options.onLogout) {
                options.onLogout();
            }
        });

        WL.init({
            client_id: options.clientId,
            redirect_uri: location.href,
            response_type: "token",
            scope: ["wl.basic"]
        });
    };

})(this);