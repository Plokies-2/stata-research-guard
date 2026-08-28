# collect_export — complete StataCorp manual entry

collect export — Export table from a collection

## Description

    collect export exports a table from a collection to a specified document type.
    You can also include a table in a report created by putdocx, putpdf, or putexcel; see [RPT] putdocx
 collect, [RPT] putpdf collect, and [RPT] putexcel.

## Quick start

 Export a table from the current collection to myfile.xlsx
       collect export myfile.xlsx
 Export a table from the collection c2 to myfile2.xlsx
       collect export myfile2.xlsx, name(c2)
 Same as above, but export the table to sheet Table1, instead of the default Sheet1
      collect export myfile2.xlsx, name(c2) sheet(Table1)
 Export a table from the current collection to table1.docx, replacing the file if it exists
       collect export table1.docx, replace
 Same as above, and save the putdocx commands used to export the table in table1.do
      collect export table1.docx, replace dofile(table1)
 Export a table from the current collection to table1.tex
       collect export table1.tex
 Same as above, but export the table only, instead of creating a complete LATEX document
      collect export table1.tex, tableonly

## Menu

 Statistics > Summaries, tables, and tests > Tables and collections > Build and style table

## Syntax

    collect export filename.suffix [ , export options document options ]

 export options                     Description
 name(cname)                        export collection cname
 as(fileformat )                    specify document type
 replace                            overwrite existing file

 By default, collect export will try to determine the document type from suffix using the following
 table:
                       Implied
 suffix                option                File type
 docx                  as(docx)              Microsoft Word
 html                  as(html)              HTML 5 with CSS
 pdf                   as(pdf)               PDF (Portable Document Format)
 xlsx                  as(xlsx)              Microsoft Excel 2007/2010 or newer
 xls                   as(xls)               Microsoft Excel 1997/2003
 tex                   as(tex)               LATEX
 smcl                  as(smcl)              SMCL (Stata Markup and Control Language)
 txt                   as(txt)               plain text
 markdown              as(markdown)          Markdown
 md                    as(markdown)          Markdown

 document options                   Description
 docx options                       when exporting to .docx files
 html options                       when exporting to .html files
 pdf options                        when exporting to .pdf files
 excel options                      when exporting to .xls and .xlsx files
 tex options                        when exporting to .tex files
 smcl option                        when exporting to .smcl files
 txt option                         when exporting to .txt files
 md option                          when exporting to .markdown and .md files

 docx options                       Description
 noisily                            show the putdocx commands used to export to the .docx file
 dofile(filename[, replace ])       save the putdocx commands used for exporting to the named
                                      do-file

 html options                       Description
 prefix(prefix)                     use prefix to identify style classes
 cssfile(cssfile)                   define the styles in cssfile instead of filename
 tableonly                          export only the table to the specified file
 append                             append to an existing file

pdf options                                 Description
noisily                                     show the putpdf commands used to export to the PDF file
dofile(filename[, replace ])                save the putpdf commands used for exporting to the named
                                              do-file

excel options                               Description
noisily                                     show the putexcel commands used to export to the Excel file
dofile(filename[, replace ])                save the putexcel commands used for exporting to
                                              the named do-file
cell(cell)                                  specify the Excel upper-left cell as the starting position to
                                              export the table; the default is cell(A1)
modify                                      modify Excel file
sheet(sheetname [, replace ])               specify the worksheet to use; the default sheet name
                                              is Sheet1
noopen                                      do not open Excel file in memory

noopen does not appear in the dialog box.

tex options                                 Description
tableonly                                   export only the table to the specified file
append                                      append to an existing file

smcl option                                 Description
append                                      append to an existing file

txt option                                  Description
append                                      append to an existing file

md option                                   Description
append                                      append to an existing file

## Options

    Options are presented under the following headings:
                 export options
                 docx options
                 html options
                 pdf options
                 excel options
                 tex options
                 smcl option
                 txt option
                 md option

export options
 name(cname) specifies a collection to export instead of the current collection.
 as(fileformat ) specifies the file format to which the collection is to be exported. This option is rarely
   specified because, by default, collect export determines the format from the suffix of the file being
   created.
 replace permits collect export to overwrite an existing file.

docx options
 noisily specifies that collect export show the putdocx commands used to export to the .docx file.
 dofile(filename[ , replace ]) specifies that collect export save to filename the putdocx com-
   mands used to export to the .docx file. If filename already exists, it can be overwritten by specifying
   replace. If filename is specified without an extension, .do is assumed.

html options
 prefix(prefix) specifies that collect export use prefix to identify style classes for the exported HTML
   table.
 cssfile(cssfile) specifies that collect export define the styles in cssfile instead of filename.
 tableonly specifies that only the table be exported to the specified file. With this option, the produced
   file may be included in other HTML documents. By default, collect export produces a complete
   HTML document.
    If option cssfile() is not specified, a CSS filename is constructed from filename, with the extension
    replaced with .css.
 append specifies that collect export append the table to an existing file.
    This option implies option tableonly.
    If the target CSS file already exists, collect export will also append to it.

pdf options
 noisily specifies that collect export show the putpdf commands used to export to the PDF file.

 dofile(filename[ , replace ]) specifies that collect export save to filename the putpdf commands
   used to export to the PDF file. If filename already exists, it can be overwritten by specifying replace.
   If filename is specified without an extension, .do is assumed.

excel options
 noisily specifies that collect export show the putexcel commands used to export to the .xls or
   .xlsx file.
 dofile(filename[ , replace ]) specifies that collect export save to filename the putexcel com-
   mands used to export to the .xls or .xlsx file. If filename already exists, it can be overwritten by
   specifying replace. If filename is specified without an extension, .do is assumed.
 cell(cell) specifies an Excel upper-left cell as the starting position to publish the table. The default is
   cell(A1).
 modify permits putexcel set to modify an Excel file. For more information about this option, see
   [RPT] putexcel.
 sheet(sheetname [ , replace ]) saves to the worksheet named sheetname. For more information about
   this option, see [RPT] putexcel.
 noopen prevents collect export from using option open in the call to putexcel set.
    By default, collect export uses the putexcel set option open to open the Excel file in memory
    for modification. This tends to improve the speed of the export if many cells or style edits are in the
    collection. For more information about the open option, see [RPT] putexcel.
    noopen is necessary only when you need to force collect export to produce do-files as it did when
    collect export was first introduced in Stata 17.

tex options
 tableonly specifies that only the table be exported to the specified file. With this option, the produced
   file may be included in other LATEX documents via the \input or \include macro.
 append specifies that collect export append the table to an existing file.
    This option implies option tableonly.

smcl option
 append specifies that collect export append the table to an existing file.

txt option
 append specifies that collect export append the table to an existing file.

md option
 append specifies that collect export append the table to an existing file.

## Remarks and examples

    Remarks are presented under the following headings:
                  Introduction
                  Styles for different documents
                  Creating more extensive documents

Introduction
    One goal of creating a customized table may be to present your findings to others. With collect
 export, you can export a collection to a variety of file types. For example, after creating a table from
 a collection of results and making styling edits to obtain the look you want, you can export a table from
 the current collection to an Excel file by typing the following:
       . collect export myfile.xlsx

 By specifying the .xlsx suffix, we have indicated that we want to export our work to a Microsoft Excel
 file. Equivalently, we could have instead specified the document type as follows:
       . collect export myfile, as(xlsx)

 Either way, we would have exported a table from the current collection to the file myfile.xlsx.

Styles for different documents
    The collect suite of commands has many formatting features that can be applied to any collection of
 results, regardless of the document you may be exporting your table to. For example, you may specify the
 numeric formatting for your results or modify the labels for the dimensions. But there are also some style
 specifications that are specific to the type of document you will be exporting to. For example, you can
 use collect style html to specify whether adjacent cell borders should be collapsed in the resulting
 HTML file. If you will be exporting a table to a .docx or .pdf file, you can see collect style putdocx
 and collect style putpdf for some style specifications specific to those types of documents.
    Additionally, you can add a custom table title with collect title and notes with collect notes.
 These commands add the title and notes in plain text, but you can specify the appearance style for the title
 and notes, respectively, with collect style title and collect style notes. Certain appearance
 edits can be rendered only on certain types of documents. For example, you can specify the font size and
 color if you will export your table to a Microsoft Excel, an HTML, or a LATEX file.

Creating more extensive documents
    With collect export, you can export a customized table to the file format of your choice. If you
 are exporting to an HTML, a LATEX, a SMCL, a Markdown, or a plain text file, you can export multiple
 tables to a single file with the append option. But you may want to create documents with more than
 these customized tables.
    For example, when you export a table to an HTML or a LATEX file, collect export creates a complete
 document with the table from the current collection. If you want to incorporate this table in a more
 extensive document, you can use the tableonly option to export just the table to the specified file.
    Additionally, suppose that you wish to export your table to a .docx or .pdf file but you want that
 table to be part of a report that also includes graphs, text, and other results from Stata. By using the
 putdocx and putpdf suites, you can incorporate the customized table in the active document with
 putdocx collect and putpdf collect.

    Similarly, if you want to create an Excel file with the table from the current collection and other Stata
 results or graphs, you can incorporate the table in the active Excel file by using the collect output type
 with putexcel.

## Stored results

    collect export stores the following in s():
    Macros
        s(filename)         name of the file
        s(collection)       name of collection
        s(noisily)          1 if option noisily specified, 0 otherwise
        s(dofile)           name of the new do-file
        s(cssfile)          name of the new css-file

## Also see

 [TABLES] collect style html — Collection styles for HTML files
 [TABLES] collect style putdocx — Collection styles for putdocx
 [TABLES] collect style putpdf — Collection styles for putpdf
 [TABLES] collect style smcl — Collection styles for SMCL files
 [TABLES] collect style tex — Collection styles for LATEX files
 [TABLES] collect style txt — Collection styles for plain text files
 [RPT] putdocx collect — Add a table from a collection to an Office Open XML (.docx) file
 [RPT] putexcel — Export results to an Excel file
 [RPT] putpdf collect — Add a table from a collection to a PDF file
