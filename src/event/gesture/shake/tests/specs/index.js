/**
 * test tap gesture by simulating touch event for ios/android
 * @author yiminghe@gmail.com
 */

(function () {
    var UA = require('ua');

    // TODO firefox, ie11 ??
    if (!window.DeviceMotionEvent || UA.firefox || UA.ie) {
        return;
    }

    var Event = require('event/dom');
    var ShakeType = require('event/gesture/shake');
    var SHAKE = ShakeType.SHAKE;

    describe('shake', function () {
        it('fires', function () {
            var called = 0, fn;

            Event.on(window, SHAKE, function () {
                called = 1;
            });

            window.addEventListener('x_devicemotion', fn = function (e) {
                console.log('******************************');
                console.log(e.accelerationIncludingGravity.x);
                console.log(e.accelerationIncludingGravity.z);
                console.log(e.acceleration.z);
            }, false);

            var acceleration = {
                    x: 0,
                    y: 0,
                    z: 0
                },
                accelerationIncludingGravity = {
                    x: 0,
                    y: 0,
                    z: -9
                };


            waits(30);
            (function () {
                runs(function () {
                    acceleration.x = accelerationIncludingGravity.x = 6;
                    jasmine.simulate(window, 'devicemotion', {
                        acceleration: acceleration,
                        accelerationIncludingGravity: accelerationIncludingGravity
                    });
                });
            })(0);


            waits(30);
            (function () {
                runs(function () {
                    acceleration.x = accelerationIncludingGravity.x = 26;
                    jasmine.simulate(window, 'devicemotion', {
                        acceleration: acceleration,
                        accelerationIncludingGravity: accelerationIncludingGravity
                    });
                });
            })(0);

            // buffer
            waits(350);

            runs(function () {
                expect(called).toBe(1);

                window.removeEventListener('devicemotion', fn, false);
            });
        });

        it('does not fire if x is too small', function () {
            var called = 0, fn;

            Event.on(window, SHAKE, function () {
                called = 1;
            });

            window.addEventListener('x_devicemotion', fn = function (e) {
                console.log('******************************');
                console.log(e.accelerationIncludingGravity.x);
                console.log(e.accelerationIncludingGravity.z);
                console.log(e.acceleration.z);
            }, false);

            var acceleration = {
                    x: 0,
                    y: 0,
                    z: 0
                },
                accelerationIncludingGravity = {
                    x: 0,
                    y: 0,
                    z: -9
                };


            waits(30);
            (function () {
                runs(function () {
                    acceleration.x = accelerationIncludingGravity.x = 3;
                    jasmine.simulate(window, 'devicemotion', {
                        acceleration: acceleration,
                        accelerationIncludingGravity: accelerationIncludingGravity
                    });
                });

            })(0);

            waits(30);
            (function () {
                runs(function () {
                    acceleration.x = accelerationIncludingGravity.x = 2;
                    jasmine.simulate(window, 'devicemotion', {
                        acceleration: acceleration,
                        accelerationIncludingGravity: accelerationIncludingGravity
                    });
                });

            })(0);


            // buffer
            waits(350);

            runs(function () {
                expect(called).toBe(0);
                window.removeEventListener('devicemotion', fn, false);
            });
        });

        it('does not fire if x is not big enough', function () {
            var called = 0, fn;

            Event.on(window, SHAKE, function () {
                called = 1;
            });

            window.addEventListener('x_devicemotion', fn = function (e) {
                console.log('******************************');
                console.log(e.accelerationIncludingGravity.x);
                console.log(e.accelerationIncludingGravity.z);
                console.log(e.acceleration.z);
            }, false);

            var acceleration = {
                    x: 0,
                    y: 0,
                    z: 0
                },
                accelerationIncludingGravity = {
                    x: 0,
                    y: 0,
                    z: -9
                };


            waits(30);
            (function () {
                runs(function () {
                    acceleration.x = accelerationIncludingGravity.x = 9;
                    jasmine.simulate(window, 'devicemotion', {
                        acceleration: acceleration,
                        accelerationIncludingGravity: accelerationIncludingGravity
                    });
                });

            })(0);

            waits(30);
            (function () {
                runs(function () {
                    acceleration.x = accelerationIncludingGravity.x = 15;
                    jasmine.simulate(window, 'devicemotion', {
                        acceleration: acceleration,
                        accelerationIncludingGravity: accelerationIncludingGravity
                    });
                });

            })(0);


            // buffer
            waits(350);

            runs(function () {
                expect(called).toBe(0);

                window.removeEventListener('devicemotion', fn, false);
            });
        });
    });
})();