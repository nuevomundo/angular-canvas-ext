canvasExtModule.directive('apCanvas', function (apImageHelper) {
  return {
    restrict: 'A',
    scope: {
      binding: '=',
      src: '=?'
    },
    link: function ($scope, element, attrs) {
      var canvas = element[0], ctx = canvas.getContext('2d'), previousMousePosition = null, isMoving = false, defaultScale = 0, isUpdateOffset = false, isUpdateScale = false, lastZoomDist = null;
      if (!$scope.binding.offset) {
        $scope.binding.offset = {
          x: 0,
          y: 0
        };
      }
      if (!$scope.src) {
        $scope.src = $scope.binding.src;
      }
      if (!$scope.binding.mode) {
        $scope.binding.mode = 'fill';
      }
      $scope.$watch('src', function (newSrc) {
        if (newSrc) {
          loadImage();
        } else {
          $scope.binding.image = null;
        }
      });
      $scope.getElementDimensions = function () {
        // return element.offsetParent().width();
        return element.parent()[0].offsetWidth;
      };
      $scope.$watch($scope.getElementDimensions, function (newValue, oldValue) {
        canvas.width = newValue;
        if ($scope.binding.aspect) {
          canvas.height = $scope.binding.aspect * canvas.width;
        }
        if ($scope.binding.image) {
          updateDefaultScale();
          updateScale();
          drawImage();
        }
      });
      function loadImage() {
        var image = new Image();
        image.onload = function () {
          $scope.binding.image = image;
          $scope.$apply();
        };
        image.src = $scope.src;
      }
      // $scope.$watch(function () {
      //   return $scope.binding.image;
      // }
      $scope.$watch('binding.image', function (newImage, oldImage) {
        canvas.width = canvas.width;
        if (newImage) {
          updateDefaultScale();
          if (oldImage || !$scope.binding.scale) {
            updateScale();
          }
          drawImage();
        }
      });
      function setScale(scale) {
        isUpdateScale = true;
        $scope.binding.scale = scale;
        isUpdateScale = false;
      }
      function updateDefaultScale() {
        var image = $scope.binding.image, widthScale = canvas.width / image.width, heightScale = canvas.height / image.height;
        if ($scope.binding.mode === 'fill') {
          defaultScale = Math.max(widthScale, heightScale);
        } else if ($scope.binding.mode === 'fit') {
          defaultScale = Math.min(widthScale, heightScale);
        } else {
          defaultScale = 1;
        }
      }
      function updateScale() {
        setScale(defaultScale);
      }
      function drawImage() {
        if (!$scope.binding.image || isUpdateScale || isUpdateOffset) {
          return;
        }
        clipToBounds();
        $scope.binding.frame = apImageHelper.drawImage($scope.binding.image, $scope.binding.scale, $scope.binding.offset, ctx);
      }
      function clipToBounds() {
        var widthScale = canvas.width / $scope.binding.image.width, heightScale = canvas.height / $scope.binding.image.height;
        var minZoom = Math.max(widthScale, heightScale);
        $scope.binding.zoom = {
          min: minZoom,
          max: 3
        };
        isUpdateOffset = true;
        var bounds = {
            width: canvas.width,
            height: canvas.height
          }, offsetLimits = apImageHelper.getImageOffsetLimits($scope.binding.image, $scope.binding.scale, bounds);
        if ($scope.binding.offset.y < offsetLimits.top) {
          $scope.binding.offset.y = offsetLimits.top;
        }
        if ($scope.binding.offset.y > offsetLimits.bottom) {
          $scope.binding.offset.y = offsetLimits.bottom;
        }
        if ($scope.binding.offset.x < offsetLimits.left) {
          $scope.binding.offset.x = offsetLimits.left;
        }
        if ($scope.binding.offset.x > offsetLimits.right) {
          $scope.binding.offset.x = offsetLimits.right;
        }
        isUpdateOffset = false;
      }
      // Set zoomable to true
      if (true) {
        function getMousePosition(e) {
          var rect = canvas.getBoundingClientRect();
          return {
            x: (e.clientX - rect.left) / $scope.binding.scale,
            y: (e.clientY - rect.top) / $scope.binding.scale
          };
        }
        function setIsMoving(moving, event, position) {
          event.preventDefault();
          isMoving = moving;
          if (moving) {
            previousMousePosition = getMousePosition(position);
          }
        }
        function moveTo(e, position) {
          if (isMoving) {
            e.preventDefault();
            var mousePosition = getMousePosition(position);
            $scope.binding.offset = {
              x: $scope.binding.offset.x + (mousePosition.x - previousMousePosition.x),
              y: $scope.binding.offset.y + (mousePosition.y - previousMousePosition.y)
            };
            previousMousePosition = mousePosition;
            $scope.$apply();
          }
        }
        function zoom(e, touch1, touch2) {
          e.preventDefault();
          var dist = Math.sqrt(Math.pow(touch2.pageX - touch1.pageX, 2) + Math.pow(touch2.pageY - touch1.pageY, 2));
          if (lastZoomDist) {
            $scope.binding.scale *= dist / lastZoomDist;
            $scope.$apply();
          }
          lastZoomDist = dist;
        }
        function handleMouseDown(e) {
          setIsMoving(true, e, e);
        }
        function handleTouchStart(e) {
          if (e.targetTouches.length === 1) {
            setIsMoving(true, e, e.changedTouches[0]);
          }
        }
        function handleMouseUp(e) {
          setIsMoving(false, e);
        }
        function handleTouchEnd(e) {
          lastZoomDist = null;
          setIsMoving(false, e);
        }
        function handleMouseMove(e) {
          moveTo(e, e);
        }
        function handleTouchMove(e) {
          if (e.targetTouches.length >= 2) {
            var touch1 = e.targetTouches[0], touch2 = e.targetTouches[1];
            if (touch1 && touch2) {
              zoom(e, touch1, touch2);
            }
          } else {
            moveTo(e, e.changedTouches[0]);
          }
        }
        function handleMouseWheel(e) {
          if (e.wheelDelta > 0) {
            $scope.binding.scale *= 1.01;
          } else {
            $scope.binding.scale /= 1.01;
          }
        }
        canvas.addEventListener('mousedown', handleMouseDown, false);
        canvas.addEventListener('mouseup', handleMouseUp, false);
        canvas.addEventListener('mouseleave', handleMouseUp, false);
        canvas.addEventListener('mousemove', handleMouseMove, false);
        canvas.addEventListener('mousewheel', handleMouseWheel, false);
        canvas.addEventListener('touchstart', handleTouchStart, false);
        canvas.addEventListener('touchend', handleTouchEnd, false);
        canvas.addEventListener('touchcancel', handleTouchEnd, false);
        canvas.addEventListener('touchleave', handleTouchEnd, false);
        canvas.addEventListener('touchmove', handleTouchMove, false);
        $scope.$watch(function () {
          return $scope.binding.scale;
        }, function (newScale, oldScale) {
          if (newScale && newScale < defaultScale) {
            setScale(defaultScale);
          }
          drawImage();
        });
        $scope.$watch(function () {
          return $scope.binding.offset;
        }, function (newOffset) {
          drawImage();
        });
      }
    }
  };
});
