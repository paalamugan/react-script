// declare a react container

angular.module('app').directive('reactContainer', function ($window, $timeout,
    $state, $location, $injector, $rootScope, ReactScript) {

  return {
    restrict: 'EA',
    template: '',
    scope: {
        isLoading: '=?'
    },
    link(scope, elem, attrs) {

        scope.isLoading = true;

        var reactDom = null;
        var reactFeature = $window.ReactFeature;
        var maxLoadCount = 20;
        var loadCount = 0;
        var interval = 0;

        var componentName = attrs.name;

        if (!componentName) {
            console.error(new Error("Component name is required."));
            return;
        }

        var loadDynamicScript = function(scriptName, callback) {

            var splits = scriptName.split('.');
            var nodeName = splits[splits.length - 1] === 'css' ? 'link' : 'script';

            var node = document.createElement(nodeName);

            if (nodeName === 'link') {

                node.rel = "stylesheet";
                node.type = "text/css";
                node.href = '/react/' + scriptName;
                document.head.appendChild(node);

                return typeof callback === "function" && callback();

            }

            node.type = "text/javascript";
            node.src = '/react/' + scriptName;
            document.body.appendChild(node);

            node.onload = function () {
                if (typeof callback === "function") {
                    callback();
                }
            };

            node.onerror = function (err) {
                if (typeof callback === "function") {
                    callback();
                }
            };

        };

        var onReactDOMLoad = function (interval) {

            if (!reactFeature) {
                reactFeature = $window.ReactFeature;
            }

            $timeout(function() {

                if (!reactFeature && loadCount <= maxLoadCount) {

                    interval = interval + 100;
                    loadCount += 1;

                    return onReactDOMLoad(interval);

                } else if (!reactFeature && loadCount > maxLoadCount) {

                    console.error(new Error("React mounting failed!"));
                    return;
                }

                var props = {
                    $injector: $injector,
                    $rootScope: $rootScope,
                    $scope: scope,
                    pathname: $location.path()
                };

                $(document.body).addClass('is-react-dom');

                scope.isLoading = false;

                reactDom = reactFeature.render(componentName, props, elem[0]);

            }, interval);

        }

        if (!reactFeature) {
            // Inject a react script dynamically in body
            ReactScript.query({}, function (scripts) { // Server call return a batch of react script file names []

                var done = _.after(scripts.length, function() {
                    onReactDOMLoad(interval)
                });

                _.forEach(scripts, function(scriptName) {
                  loadDynamicScript(scriptName, done);
                });

            });

        } else {
            onReactDOMLoad(interval);
        }

        scope.$on('$destroy', () => {
            $(document.body).removeClass('is-react-dom');
            reactDom && reactDom.unmountComponentAtNode(elem[0]);
        });
    },
  };
});
