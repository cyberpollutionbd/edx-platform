(function (undefined) {
    'use strict';
    describe('VideoPlayer Save State plugin', function () {
        var state, oldOTBD;

        beforeEach(function () {
            oldOTBD = window.onTouchBasedDevice;
            window.onTouchBasedDevice = jasmine
                .createSpy('onTouchBasedDevice')
                .andReturn(null);

            jasmine.stubRequests();
            state = jasmine.initializePlayer();
            spyOn(state.storage, 'setItem');
        });

        afterEach(function () {
            $('source').remove();
            window.onTouchBasedDevice = oldOTBD;
            state.storage.clear();
            if (state.videoPlayer) {
                state.videoPlayer.destroy();
            }
        });

        describe('saveState function', function () {
            var videoPlayerCurrentTime, newCurrentTime, speed;

            // We make sure that `currentTime` is a float. We need to test
            // that Math.round() is called.
            videoPlayerCurrentTime = 3.1242;

            // We have two times, because one is  stored in
            // `videoPlayer.currentTime`, and the other is passed directly to
            // `saveState` in `data` object. In each case, there is different
            // code that handles these times. They have to be different for
            // test completeness sake. Also, make sure it is float, as is the
            // time above.
            newCurrentTime = 5.4;
            speed = '0.75';

            beforeEach(function () {
                state.videoPlayer.currentTime = videoPlayerCurrentTime;
                spyOn(Time, 'formatFull').andCallThrough();
            });

            it('data is not an object, async is true', function () {
                itSpec({
                    asyncVal: true,
                    speedVal: undefined,
                    positionVal: videoPlayerCurrentTime,
                    data: undefined,
                    ajaxData: {
                        saved_video_position: Time.formatFull(Math.round(videoPlayerCurrentTime))
                    }
                });
            });

            it('data contains speed, async is false', function () {
                itSpec({
                    asyncVal: false,
                    speedVal: speed,
                    positionVal: undefined,
                    data: {
                        speed: speed
                    },
                    ajaxData: {
                        speed: speed
                    }
                });
            });

            it('data contains float position, async is true', function () {
                itSpec({
                    asyncVal: true,
                    speedVal: undefined,
                    positionVal: newCurrentTime,
                    data: {
                        saved_video_position: newCurrentTime
                    },
                    ajaxData: {
                        saved_video_position: Time.formatFull(Math.round(newCurrentTime))
                    }
                });
            });

            it('data contains speed and rounded position, async is false', function () {
                itSpec({
                    asyncVal: false,
                    speedVal: speed,
                    positionVal: Math.round(newCurrentTime),
                    data: {
                        speed: speed,
                        saved_video_position: Math.round(newCurrentTime)
                    },
                    ajaxData: {
                        speed: speed,
                        saved_video_position: Time.formatFull(Math.round(newCurrentTime))
                    }
                });
            });

            it('data contains empty object, async is true', function () {
                itSpec({
                    asyncVal: true,
                    speedVal: undefined,
                    positionVal: undefined,
                    data: {},
                    ajaxData: {}
                });
            });

            it('data contains position 0, async is true', function () {
                itSpec({
                    asyncVal: true,
                    speedVal: undefined,
                    positionVal: 0,
                    data: {
                        saved_video_position: 0
                    },
                    ajaxData: {
                        saved_video_position: Time.formatFull(Math.round(0))
                    }
                });
            });

            function itSpec(value) {
                var asyncVal    = value.asyncVal,
                    speedVal    = value.speedVal,
                    positionVal = value.positionVal,
                    data        = value.data,
                    ajaxData    = value.ajaxData;

                state.videoSaveStatePlugin.saveState(asyncVal, data);

                if (speedVal) {
                    expect(state.storage.setItem).toHaveBeenCalledWith(
                        'speed',
                        speedVal,
                        true
                    );
                }
                if (positionVal) {
                    expect(state.storage.setItem).toHaveBeenCalledWith(
                        'savedVideoPosition',
                        positionVal,
                        true
                    );
                    expect(Time.formatFull).toHaveBeenCalledWith(
                        positionVal
                    );
                }
                expect($.ajax).toHaveBeenCalledWith({
                    url: state.config.saveStateUrl,
                    type: 'POST',
                    async: asyncVal,
                    dataType: 'json',
                    data: ajaxData
                });
            }
        });

        it('can save state on speed change', function () {
            state.el.trigger('speedchange', ['2.0']);
            expect($.ajax).toHaveBeenCalledWith({
                url: state.config.saveStateUrl,
                type: 'POST',
                async: true,
                dataType: 'json',
                data: {speed: '2.0'}
            });
        });

        it('can save state on page unload', function () {
            $.ajax.reset();
            state.videoSaveStatePlugin.onUnload();
            expect($.ajax).toHaveBeenCalledWith({
                url: state.config.saveStateUrl,
                type: 'POST',
                async: false,
                dataType: 'json',
                data: {saved_video_position: '00:00:00'}
            });
        });

        it('can save state on pause', function () {
            state.el.trigger('pause');
            expect($.ajax).toHaveBeenCalledWith({
                url: state.config.saveStateUrl,
                type: 'POST',
                async: true,
                dataType: 'json',
                data: {saved_video_position: '00:00:00'}
            });
        });

        it('can save state on language change', function () {
            state.el.trigger('language_menu:change', ['ua']);
            expect(state.storage.setItem).toHaveBeenCalledWith('language', 'ua');
        });

        it('can save information about youtube availability', function () {
            state.el.trigger('youtube_availability', [true]);
            expect($.ajax).toHaveBeenCalledWith({
                url: state.config.saveStateUrl,
                type: 'POST',
                async: true,
                dataType: 'json',
                data: {youtube_is_available: true}
            });
        });

        it('can destroy itself', function () {
            var plugin = state.videoSaveStatePlugin;
            spyOn($.fn, 'off').andCallThrough();
            state.videoSaveStatePlugin.destroy();
            expect(state.videoSaveStatePlugin).toBeUndefined();
            expect($.fn.off).toHaveBeenCalledWith({
                'speedchange': plugin.onSpeedChange,
                'play': plugin.bindUnloadHandler,
                'pause destroy': plugin.saveStateHandler,
                'language_menu:change': plugin.onLanguageChange,
                'youtube_availability': plugin.onYoutubeAvailability
            });
            expect($.fn.off).toHaveBeenCalledWith('destroy', plugin.destroy);
            expect($.fn.off).toHaveBeenCalledWith('unload', plugin.onUnload);
        });
    });

}).call(this);