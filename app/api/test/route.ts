import { NextResponse } from "next/server";

type TermiiJson = Record<string, unknown>;

type Phonebook = {
  id?: string;
  name?: string;
  phonebook_name?: string;
  total_number_of_contacts?: number;
  date_created?: string;
};

type PhonebooksResponse = {
  content?: Phonebook[];
  [key: string]: unknown;
};

async function parseTermiiResponse(
  response: Response
): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {
      rawResponse: text,
    };
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.TERMII_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "TERMII_API_KEY is missing",
      },
      { status: 500 }
    );
  }

  const baseUrl =
    process.env.TERMII_BASE_URL?.replace(/\/+$/, "") ||
    "https://v4.api.termii.com";

  const createPhonebookUrl = `${baseUrl}/api/phonebooks`;
  const uploadContactsUrl =
    `${baseUrl}/api/phonebooks/contacts/upload`;

  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const phonebookNameValue = formData.get("phonebook_name");
    const descriptionValue = formData.get("description");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "CSV file is required.",
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "The uploaded CSV file is empty.",
        },
        { status: 400 }
      );
    }

    const phonebookName =
      typeof phonebookNameValue === "string" &&
      phonebookNameValue.trim()
        ? phonebookNameValue.trim()
        : `BBUpdates CSV Test ${Date.now()}`;

    const description =
      typeof descriptionValue === "string" &&
      descriptionValue.trim()
        ? descriptionValue.trim()
        : "Testing Termii Phonebook CSV upload";

    /*
     * ============================================================
     * STEP 1 — CREATE PHONEBOOK
     * ============================================================
     */

    const createPayload = {
      api_key: apiKey,
      phonebook_name: phonebookName,
      description,
    };

    console.log(
      "=================================================="
    );
    console.log("TERMII PHONEBOOK CSV TEST");
    console.log(
      "=================================================="
    );
    console.log("STEP 1: CREATE PHONEBOOK");
    console.log("URL:", createPhonebookUrl);
    console.log("METHOD: POST");
    console.log("PHONEBOOK NAME:", phonebookName);

    const createResponse = await fetch(createPhonebookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(createPayload),
      cache: "no-store",
    });

    const createData = await parseTermiiResponse(
      createResponse
    );

    console.log(
      "CREATE PHONEBOOK STATUS:",
      createResponse.status
    );

    console.log(
      "CREATE PHONEBOOK RESPONSE:",
      createData
    );

    /*
     * If Termii rejects the phonebook creation,
     * stop here because we cannot upload contacts
     * without a phonebook ID.
     */

    if (!createResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          step: "create_phonebook",

          createPhonebook: {
            request: {
              method: "POST",
              url: createPhonebookUrl,
              body: {
                api_key: "***REDACTED***",
                phonebook_name: phonebookName,
                description,
              },
            },

            response: {
              status: createResponse.status,
              ok: createResponse.ok,
              data: createData,
            },
          },

          uploadContacts: null,
        },
        {
          status: createResponse.status,
        }
      );
    }

    /*
     * ============================================================
     * STEP 2 — FIND THE CREATED PHONEBOOK ID
     * ============================================================
     *
     * The Create Phonebook response in the documentation does not
     * return the phonebook ID.
     *
     * Therefore we fetch the phonebooks and locate the phonebook
     * using the unique name generated above.
     */

    const fetchPhonebooksUrl =
      `${baseUrl}/api/phonebooks?api_key=${encodeURIComponent(
        apiKey
      )}`;

    console.log(
      "=================================================="
    );
    console.log("STEP 2: FETCH PHONEBOOKS");
    console.log("URL:", fetchPhonebooksUrl);
    console.log("METHOD: GET");

    const phonebooksResponse = await fetch(
      fetchPhonebooksUrl,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const phonebooksData =
      await parseTermiiResponse(phonebooksResponse);

    console.log(
      "FETCH PHONEBOOKS STATUS:",
      phonebooksResponse.status
    );

    console.log(
      "FETCH PHONEBOOKS RESPONSE:",
      phonebooksData
    );

    if (!phonebooksResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          step: "fetch_phonebooks",

          createPhonebook: {
            request: {
              method: "POST",
              url: createPhonebookUrl,
              body: {
                api_key: "***REDACTED***",
                phonebook_name: phonebookName,
                description,
              },
            },
            response: {
              status: createResponse.status,
              ok: createResponse.ok,
              data: createData,
            },
          },

          fetchPhonebooks: {
            request: {
              method: "GET",
              url: fetchPhonebooksUrl,
            },
            response: {
              status: phonebooksResponse.status,
              ok: phonebooksResponse.ok,
              data: phonebooksData,
            },
          },

          uploadContacts: null,
        },
        {
          status: phonebooksResponse.status,
        }
      );
    }

    const parsedPhonebooks =
      phonebooksData as PhonebooksResponse;

    const phonebooks =
      Array.isArray(parsedPhonebooks.content)
        ? parsedPhonebooks.content
        : [];

    const createdPhonebook = phonebooks.find(
      (phonebook) =>
        phonebook.name === phonebookName ||
        phonebook.phonebook_name === phonebookName
    );

    const phonebookId = createdPhonebook?.id;

    /*
     * We cannot continue without the ID.
     */

    if (!phonebookId) {
      return NextResponse.json(
        {
          success: false,
          step: "find_phonebook_id",

          message:
            "Phonebook was created, but its ID could not be found in the phonebook list.",

          phonebookName,

          createPhonebook: {
            request: {
              method: "POST",
              url: createPhonebookUrl,
              body: {
                api_key: "***REDACTED***",
                phonebook_name: phonebookName,
                description,
              },
            },
            response: {
              status: createResponse.status,
              ok: createResponse.ok,
              data: createData,
            },
          },

          fetchPhonebooks: {
            request: {
              method: "GET",
              url: fetchPhonebooksUrl,
            },
            response: {
              status: phonebooksResponse.status,
              ok: phonebooksResponse.ok,
              data: phonebooksData,
            },
          },

          uploadContacts: null,
        },
        { status: 500 }
      );
    }

    console.log("PHONEBOOK ID:", phonebookId);

    /*
     * ============================================================
     * STEP 3 — UPLOAD CSV CONTACTS
     * ============================================================
     *
     * According to the Termii documentation:
     *
     * POST /api/phonebooks/contacts/upload
     *
     * multipart/form-data:
     *
     * file    -> CSV file
     * contact -> JSON object containing:
     *            pid
     *            country_code
     *            api_key
     *
     * The `contact` field itself must be application/json.
     */

    const uploadFormData = new FormData();

    uploadFormData.append(
      "file",
      file,
      file.name || "contacts.csv"
    );

    const contactData = {
      pid: phonebookId,
      country_code: "234",
      api_key: apiKey,
    };

    const contactBlob = new Blob(
      [JSON.stringify(contactData)],
      {
        type: "application/json",
      }
    );

    uploadFormData.append(
      "contact",
      contactBlob,
      "contact.json"
    );

    console.log(
      "=================================================="
    );
    console.log("STEP 3: UPLOAD CSV CONTACTS");
    console.log("URL:", uploadContactsUrl);
    console.log("METHOD: POST");
    console.log("FILE:", file.name);
    console.log("FILE SIZE:", file.size);
    console.log("PHONEBOOK ID:", phonebookId);
    console.log("COUNTRY CODE:", "234");

    const uploadResponse = await fetch(
      uploadContactsUrl,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: uploadFormData,
        cache: "no-store",
      }
    );

    const uploadData =
      await parseTermiiResponse(uploadResponse);

    console.log(
      "UPLOAD CONTACTS STATUS:",
      uploadResponse.status
    );

    console.log(
      "UPLOAD CONTACTS RESPONSE:",
      uploadData
    );

    /*
     * ============================================================
     * FINAL RESPONSE
     * ============================================================
     */

    return NextResponse.json(
      {
        success:
          createResponse.ok &&
          phonebooksResponse.ok &&
          uploadResponse.ok,

        phonebook: {
          id: phonebookId,
          name: phonebookName,
        },

        createPhonebook: {
          request: {
            method: "POST",
            url: createPhonebookUrl,
            body: {
              api_key: "***REDACTED***",
              phonebook_name: phonebookName,
              description,
            },
          },

          response: {
            status: createResponse.status,
            ok: createResponse.ok,
            data: createData,
          },
        },

        fetchPhonebooks: {
          request: {
            method: "GET",
            url: fetchPhonebooksUrl,
          },

          response: {
            status: phonebooksResponse.status,
            ok: phonebooksResponse.ok,
            data: phonebooksData,
          },
        },

        uploadContacts: {
          request: {
            method: "POST",
            url: uploadContactsUrl,
            multipart: {
              file: {
                name: file.name,
                size: file.size,
                type: file.type,
              },

              contact: {
                pid: phonebookId,
                country_code: "234",
                api_key: "***REDACTED***",
              },
            },
          },

          response: {
            status: uploadResponse.status,
            ok: uploadResponse.ok,
            data: uploadData,
          },
        },
      },
      {
        status: uploadResponse.ok
          ? 200
          : uploadResponse.status,
      }
    );
  } catch (error: unknown) {
    console.error(
      "TERMII CSV PHONEBOOK TEST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown server error",
      },
      { status: 500 }
    );
  }
}