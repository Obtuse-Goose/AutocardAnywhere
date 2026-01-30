<?php


$ignore_files_regexps = array(
    "\.git",
    "build\.php$",
    ".*\.zip$",
    'manifest\.json$' // Manifest is written in from memory rather than the file.
);

$manifest = json_decode(file_get_contents('manifest.json'));

$versionNumber = explode('.', $manifest->{'version'});

if (count($versionNumber) != 3) {
    exit('Version number error' . PHP_EOL);
}

$versionNumber[1]++;
$versionNumber[2] = '0';

$manifest->{'version'} = implode('.', $versionNumber);
file_put_contents('manifest.json', json_encode($manifest, JSON_PRETTY_PRINT));

$path = getcwd();

$files = [];
foreach (new RecursiveIteratorIterator( new RecursiveDirectoryIterator($path, RecursiveDirectoryIterator::SKIP_DOTS)) as $file) {
    array_push($files, str_replace('\\', '/', str_replace(getcwd() . '\\', '', $file)));
}

for ($i = (count($files)-1); $i >= 0; $i--) {
    $filename = $files[$i];
    //print($filename . PHP_EOL);
    foreach ($ignore_files_regexps as $pattern) {
        if (preg_match('/'.$pattern.'/', $filename)) {
            array_splice($files, $i, 1);
        }
    }
    
}

function zip($files, $manifest, $filename) {
    if (file_exists($filename)) {
        unlink($filename);
    }
    $zip = new \ZipArchive;
    if ($zip->open($filename, \ZIPARCHIVE::CREATE | \ZipArchive::OVERWRITE)) {
        foreach($files as $file) {
            if ($filename == 'Firefox.zip' && preg_match('/mtg-data\.json$/', $file)) {
                //print($file . PHP_EOL);
                $handle = fopen($file, "r");
                $contents = fread($handle, 4000000);
                fclose($handle);
                $end = strrpos($contents, ']', -1) + 1;
                //print $end . PHP_EOL;
                $contents = substr($contents, 0, $end) . '}}';
                //file_put_contents('test.json', $contents);
                //print($contents . PHP_EOL);
                $zip->AddFromString($file, $contents);
            }
            else {
                $zip->addFile($file, $file);
            }
        }
        $zip->AddFromString('manifest.json', $manifest);
        $zip->close();
    }
}

//print_r($files);

// Firefox
$manifest->{'background'} = array("scripts" => array(
    "settings.js",
    "games/dictionary.js",
    "games/games.js",
    "background.js"
));
zip($files, json_encode($manifest, JSON_PRETTY_PRINT), 'Firefox.zip');

// Chrome and Edge
$manifest->{'background'} = array("service_worker" => "background.js");
unset($manifest->{'browser_specific_settings'});
zip($files, json_encode($manifest, JSON_PRETTY_PRINT), 'Chromium.zip');

exit();
