# sysuse — complete StataCorp manual entry

webuse — Use dataset from Stata website

## Description

     webuse filename loads the specified dataset, obtaining it over the web. By default, datasets are ob-
 tained from https://www.stata-press.com/data/r19/. If filename is specified without a suffix, .dta is
 assumed.
    webuse query reports the URL from which datasets will be obtained.
    webuse set allows you to specify the URL to be used as the source for datasets. webuse set without
 arguments resets the source to https://www.stata-press.com/data/r19/.
    You can see lists of available dataset names for each manual in your browser at https://www.stata-
 press.com/data/r19/ or from within Stata at help dta manuals.

## Quick start

 Load example nlswork.dta dataset from default Stata Press website
       webuse nlswork
 Same as above, but clear current dataset from memory first
      webuse nlswork, clear
 Change URL for data downloads to http://www.myuniversity.edu/mycourse
      webuse set www.myuniversity.edu/mycourse
 Reset source for datasets to Stata Press
       webuse set
 Report current URL from which datasets will be obtained
       webuse query

## Menu

 File > Example datasets...

## Syntax

 Load dataset over the web
    webuse [”]filename[”] [ , clear ]

 Report URL from which datasets will be obtained
    webuse query

 Specify URL from which dataset will be obtained
    webuse set [https://]url[/]

    webuse set [http://]url[/]

 Reset URL to default
    webuse set

Option
 clear specifies that it is okay to replace the data in memory, even though the current data have not been
   saved to disk.

## Remarks and examples

    Remarks are presented under the following headings:
                 Typical use
                 A note concerning example datasets
                 Redirecting the source

Typical use
    In the examples in the Stata manuals, we see things such as
       . use https://www.stata-press.com/data/r19/lifeexp

 The above is used to load—in this instance—the dataset lifeexp.dta. You can type that, and it will
 work:
       . use https://www.stata-press.com/data/r19/lifeexp
       (Life expectancy, 1998)

    Or you may simply type
       . webuse lifeexp
       (Life expectancy, 1998)

 webuse is a synonym for use https://www.stata-press.com/data/r19/.

A note concerning example datasets
    The datasets used to demonstrate Stata are often fictional. If you want to know whether a dataset is
 real or fictional, and its history, load the dataset and type
        . notes

 A few datasets have no notes. This means that the datasets are believed to be real but that they were
 created so long ago that information about their original source has been lost. Treat such datasets as if
 they were fictional.

Redirecting the source
    By default, webuse obtains datasets from https://www.stata-press.com/data/r19/, but you can change
                                                  sue/ has several datasets that you wish to explore. You
 that. Say that the site http://www.zzz.edu/users/~
 can type
        . webuse set http://www.zzz.edu/users/~sue

 webuse will become a synonym for use http://www.zzz.edu/users/~sue/ for the rest of the session
 or until you give another webuse command.
    When you set the URL, you may omit the trailing slash (as we did above), or you may include it:
        . webuse set http://www.zzz.edu/users/~sue/

 You may also omit https:// or http://:
        . webuse set www.zzz.edu/users/~sue

 If you type webuse set without arguments, the URL will be reset to the default,
 https://www.stata-press.com/data/r19/:
        . webuse set

## Also see

 [D] frames use — Load a set of frames from disk
 [D] sysuse — Use shipped dataset
 [D] use — Load Stata dataset
 [U] 1.2.2 Example datasets
