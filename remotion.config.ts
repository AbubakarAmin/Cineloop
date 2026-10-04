import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setConcurrency(null); // auto (respects machine cores)
// public/ holds symlinks: media/ -> ../media, assets/ -> ../assets, build/ -> ../build
// so staticFile('media/song.mp3') etc. resolve without duplicating binaries.
